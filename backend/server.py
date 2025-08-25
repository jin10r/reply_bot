from fastapi import FastAPI, APIRouter, HTTPException, UploadFile, File, Form
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.gzip import GZipMiddleware
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from typing import List, Optional
import uuid
from datetime import datetime, timedelta
import aiofiles
from PIL import Image as PILImage
import asyncio
from functools import wraps

from models import (
    TelegramAccount, TelegramAccountCreate, TelegramAccountUpdate,
    AutoReplyRule, AutoReplyRuleCreate, AutoReplyRuleUpdate,
    BotImage, BotImageCreate, BotSettings, BotSettingsUpdate,
    BotActivityLog, PhoneVerification, PhoneVerificationCode,
    TwoFactorAuth, APIResponse, StatusCheck, StatusCheckCreate,
    AccountStatus, BotStatus, MediaFile, MediaFileCreate,
    CallbackQuery, RuleTemplate, RuleStatistics, SystemNotification,
    ReplyCondition, ReplyAction, ChatFilter, InlineButton, MediaContent,
    ConditionalRule
)
from userbot_manager import UserbotManager

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Global cache for frequently accessed data
_cache = {}
_cache_ttl = {}

def cache_response(ttl_seconds=300):
    """Decorator for caching API responses"""
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # Create cache key from function name and args
            cache_key = f"{func.__name__}_{hash(str(args) + str(kwargs))}"
            
            # Check if cached and not expired
            if cache_key in _cache and datetime.utcnow() < _cache_ttl.get(cache_key, datetime.min):
                return _cache[cache_key]
            
            # Execute function and cache result
            result = await func(*args, **kwargs)
            _cache[cache_key] = result
            _cache_ttl[cache_key] = datetime.utcnow() + timedelta(seconds=ttl_seconds)
            
            return result
        return wrapper
    return decorator

def handle_errors(func):
    """Centralized error handling decorator"""
    @wraps(func)
    async def wrapper(*args, **kwargs):
        try:
            return await func(*args, **kwargs)
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e))
        except FileNotFoundError as e:
            raise HTTPException(status_code=404, detail="Resource not found")
        except PermissionError as e:
            raise HTTPException(status_code=403, detail="Permission denied")
        except Exception as e:
            logger.error(f"Unexpected error in {func.__name__}: {e}")
            raise HTTPException(status_code=500, detail="Internal server error")
    return wrapper

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create uploads directory
UPLOADS_DIR = ROOT_DIR / "uploads"
UPLOADS_DIR.mkdir(exist_ok=True)

# Initialize userbot manager
userbot_manager = UserbotManager(db)

# Create the main app without a prefix
app = FastAPI(title="Telegram Userbot Manager", version="1.0.0")

# Add GZip compression middleware
app.add_middleware(GZipMiddleware, minimum_size=1000)

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Serve static files
app.mount("/uploads", StaticFiles(directory=str(UPLOADS_DIR)), name="uploads")

async def create_database_indexes():
    """Create database indexes for better performance"""
    try:
        # Indexes for frequently queried collections
        await db.telegram_accounts.create_index("phone")
        await db.telegram_accounts.create_index("status")
        await db.auto_reply_rules.create_index([("is_active", 1), ("priority", -1)])
        await db.auto_reply_rules.create_index("account_id")
        await db.media_files.create_index([("is_active", 1), ("file_type", 1)])
        await db.media_files.create_index("tags")
        await db.bot_activity_logs.create_index([("timestamp", -1), ("rule_id", 1)])
        await db.phone_verifications.create_index("expires_at", expireAfterSeconds=0)
        await db.rule_statistics.create_index([("rule_id", 1), ("date", -1)])
        await db.system_notifications.create_index([("is_read", 1), ("created_at", -1)])
        logger.info("Database indexes created successfully")
    except Exception as e:
        logger.warning(f"Could not create some database indexes: {e}")

# Original endpoints
@api_router.get("/")
async def root():
    return {"message": "Telegram Userbot Manager API"}

@api_router.post("/status", response_model=StatusCheck)
async def create_status_check(input: StatusCheckCreate):
    status_dict = input.dict()
    status_obj = StatusCheck(**status_dict)
    _ = await db.status_checks.insert_one(status_obj.dict())
    return status_obj

@api_router.get("/status", response_model=List[StatusCheck])
async def get_status_checks():
    status_checks = await db.status_checks.find().to_list(1000)
    return [StatusCheck(**status_check) for status_check in status_checks]

# TELEGRAM ACCOUNTS ENDPOINTS
@api_router.post("/accounts/send-code")
async def send_verification_code(account_data: TelegramAccountCreate):
    """Отправка кода верификации на телефон"""
    try:
        verification_id = await userbot_manager.send_code_request(
            account_data.phone, account_data.api_id, account_data.api_hash
        )
        return APIResponse(
            success=True,
            message="Verification code sent successfully. Please check your Telegram app.",
            data={"verification_id": verification_id}
        )
    except Exception as e:
        error_message = str(e)
        # Улучшенная обработка ошибок
        if "phone_number_invalid" in error_message.lower():
            error_message = "Invalid phone number. Please use international format (+1234567890)."
        elif "api_id_invalid" in error_message.lower():
            error_message = "Invalid API ID. Please check your Telegram app credentials."
        elif "api_hash_invalid" in error_message.lower():
            error_message = "Invalid API Hash. Please check your Telegram app credentials."
        elif "flood_wait" in error_message.lower():
            error_message = "Too many requests. Please wait a few minutes and try again."
        
        logger.error(f"Send code error: {e}")
        raise HTTPException(status_code=400, detail=f"Ошибка отправки кода: {error_message}")

@api_router.post("/accounts/verify-code")
async def verify_code(verification_data: PhoneVerificationCode):
    """Верификация кода и создание аккаунта или запрос 2FA"""
    try:
        session_string = await userbot_manager.verify_phone_code(
            verification_data.verification_id, verification_data.code
        )
        
        # Проверяем если требуется 2FA
        if session_string == "2FA_REQUIRED":
            return APIResponse(
                success=True,
                message="Phone code verified. Please enter your Two-Factor Authentication password.",
                data={
                    "requires_2fa": True,
                    "verification_id": verification_data.verification_id
                }
            )
        
        # Получаем данные верификации
        verification_doc = await db.phone_verifications.find_one(
            {"id": verification_data.verification_id}
        )
        if not verification_doc:
            raise HTTPException(status_code=404, detail="Verification not found")
        
        verification = PhoneVerification(**verification_doc)
        
        # Создаем аккаунт
        account = TelegramAccount(
            phone=verification.phone,
            api_id=verification.api_id,
            api_hash=verification.api_hash,
            session_string=session_string,
            status=AccountStatus.DISCONNECTED
        )
        
        await db.telegram_accounts.insert_one(account.dict())
        
        return APIResponse(
            success=True,
            message="Account created successfully! You can now use your Telegram bot.",
            data=account.dict()
        )
        
    except Exception as e:
        error_message = str(e)
        logger.error(f"Verify code error: {e}")
        raise HTTPException(status_code=400, detail=f"Ошибка верификации: {error_message}")

@api_router.post("/accounts/verify-2fa")
async def verify_2fa(tfa_data: TwoFactorAuth):
    """Верификация 2FA пароля и создание аккаунта"""
    try:
        session_string = await userbot_manager.verify_2fa_password(
            tfa_data.verification_id, tfa_data.password
        )
        
        # Получаем данные верификации
        verification_doc = await db.phone_verifications.find_one(
            {"id": tfa_data.verification_id}
        )
        if not verification_doc:
            raise HTTPException(status_code=404, detail="Verification not found")
        
        verification = PhoneVerification(**verification_doc)
        
        # Создаем аккаунт
        account = TelegramAccount(
            phone=verification.phone,
            api_id=verification.api_id,
            api_hash=verification.api_hash,
            session_string=session_string,
            status=AccountStatus.DISCONNECTED
        )
        
        await db.telegram_accounts.insert_one(account.dict())
        
        return APIResponse(
            success=True,
            message="Account created successfully with 2FA! You can now use your Telegram bot.",
            data=account.dict()
        )
        
    except Exception as e:
        error_message = str(e)
        logger.error(f"Verify 2FA error: {e}")
        raise HTTPException(status_code=400, detail=f"Ошибка 2FA верификации: {error_message}")

@api_router.get("/accounts", response_model=List[TelegramAccount])
async def get_accounts():
    """Получение всех аккаунтов"""
    accounts = await db.telegram_accounts.find().to_list(1000)
    return [TelegramAccount(**account) for account in accounts]

@api_router.get("/accounts/{account_id}", response_model=TelegramAccount)
async def get_account(account_id: str):
    """Получение аккаунта по ID"""
    account = await db.telegram_accounts.find_one({"id": account_id})
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")
    return TelegramAccount(**account)

@api_router.put("/accounts/{account_id}")
async def update_account(account_id: str, account_update: TelegramAccountUpdate):
    """Обновление аккаунта"""
    result = await db.telegram_accounts.update_one(
        {"id": account_id},
        {"$set": account_update.dict(exclude_unset=True)}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Account not found")
    
    updated_account = await db.telegram_accounts.find_one({"id": account_id})
    return TelegramAccount(**updated_account)

@api_router.delete("/accounts/{account_id}")
async def delete_account(account_id: str):
    """Удаление аккаунта"""
    # Сначала останавливаем userbot если запущен
    await userbot_manager.stop_userbot(account_id)
    
    result = await db.telegram_accounts.delete_one({"id": account_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Account not found")
    
    return APIResponse(success=True, message="Account deleted")

# BOT CONTROL ENDPOINTS
@api_router.post("/bot/start")
async def start_bot():
    """Запуск всех userbot"""
    try:
        results = await userbot_manager.start_all_userbots()
        return APIResponse(
            success=True,
            message="Bot start initiated",
            data=results
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/bot/stop")
async def stop_bot():
    """Остановка всех userbot"""
    try:
        results = await userbot_manager.stop_all_userbots()
        return APIResponse(
            success=True,
            message="Bot stopped",
            data=results
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/bot/start/{account_id}")
async def start_account_bot(account_id: str):
    """Запуск userbot для конкретного аккаунта"""
    try:
        success = await userbot_manager.start_userbot(account_id)
        return APIResponse(
            success=success,
            message="Account bot started" if success else "Failed to start account bot"
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/bot/stop/{account_id}")
async def stop_account_bot(account_id: str):
    """Остановка userbot для конкретного аккаунта"""
    try:
        success = await userbot_manager.stop_userbot(account_id)
        return APIResponse(
            success=success,
            message="Account bot stopped" if success else "Failed to stop account bot"
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/bot/status")
async def get_bot_status():
    """Получение статуса бота"""
    settings = await userbot_manager.get_bot_settings()
    if not settings:
        # Создаем настройки по умолчанию
        settings = BotSettings()
        await db.bot_settings.insert_one(settings.dict())
    
    return {
        "status": settings.status,
        "is_running": userbot_manager.is_running,
        "active_accounts": len(userbot_manager.clients),
        "daily_response_count": settings.daily_response_count,
        "max_daily_responses": settings.max_daily_responses
    }

# BOT SETTINGS ENDPOINTS
@api_router.get("/settings", response_model=BotSettings)
async def get_bot_settings():
    """Получение настроек бота"""
    settings = await db.bot_settings.find_one()
    if not settings:
        settings = BotSettings()
        await db.bot_settings.insert_one(settings.dict())
        return settings
    return BotSettings(**settings)

@api_router.put("/settings")
async def update_bot_settings(settings_update: BotSettingsUpdate):
    """Обновление настроек бота"""
    result = await db.bot_settings.update_one(
        {},
        {"$set": settings_update.dict(exclude_unset=True)},
        upsert=True
    )
    
    updated_settings = await db.bot_settings.find_one()
    return BotSettings(**updated_settings)

# AUTO REPLY RULES ENDPOINTS
@api_router.get("/rules", response_model=List[AutoReplyRule])
async def get_rules():
    """Получение всех правил автоответов"""
    rules = await db.auto_reply_rules.find().to_list(1000)
    return [AutoReplyRule(**rule) for rule in rules]

@api_router.post("/rules", response_model=AutoReplyRule)
async def create_rule(rule_data: AutoReplyRuleCreate):
    """Создание правила автоответа"""
    rule = AutoReplyRule(**rule_data.dict())
    await db.auto_reply_rules.insert_one(rule.dict())
    return rule

@api_router.get("/rules/{rule_id}", response_model=AutoReplyRule)
async def get_rule(rule_id: str):
    """Получение правила по ID"""
    rule = await db.auto_reply_rules.find_one({"id": rule_id})
    if not rule:
        raise HTTPException(status_code=404, detail="Rule not found")
    return AutoReplyRule(**rule)

@api_router.put("/rules/{rule_id}")
async def update_rule(rule_id: str, rule_update: AutoReplyRuleUpdate):
    """Обновление правила"""
    result = await db.auto_reply_rules.update_one(
        {"id": rule_id},
        {"$set": rule_update.dict(exclude_unset=True)}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Rule not found")
    
    updated_rule = await db.auto_reply_rules.find_one({"id": rule_id})
    return AutoReplyRule(**updated_rule)

@api_router.delete("/rules/{rule_id}")
async def delete_rule(rule_id: str):
    """Удаление правила"""
    result = await db.auto_reply_rules.delete_one({"id": rule_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Rule not found")
    
    return APIResponse(success=True, message="Rule deleted")

# ACTIVITY LOGS ENDPOINTS
@api_router.get("/logs", response_model=List[BotActivityLog])
@cache_response(ttl_seconds=60)  # Cache for 1 minute
@handle_errors
async def get_activity_logs(limit: int = 100, skip: int = 0):
    """Получение логов активности"""
    logs = await db.bot_activity_logs.find().sort("timestamp", -1).skip(skip).limit(limit).to_list(limit)
    return [BotActivityLog(**log) for log in logs]

@api_router.get("/logs/stats")
@cache_response(ttl_seconds=300)  # Cache for 5 minutes
@handle_errors
async def get_activity_stats():
    """Получение статистики активности"""
    total_logs = await db.bot_activity_logs.count_documents({})
    successful_responses = await db.bot_activity_logs.count_documents({"success": True})
    failed_responses = await db.bot_activity_logs.count_documents({"success": False})
    
    # Статистика за последние 24 часа
    yesterday = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    today_logs = await db.bot_activity_logs.count_documents({"timestamp": {"$gte": yesterday}})
    
    return {
        "total_responses": total_logs,
        "successful_responses": successful_responses,
        "failed_responses": failed_responses,
        "success_rate": successful_responses / total_logs * 100 if total_logs > 0 else 0,
        "responses_today": today_logs
    }


# ENHANCED MEDIA FILES ENDPOINTS
@api_router.post("/media/upload")
async def upload_media_file(
    file: UploadFile = File(...),
    tags: str = Form(""),
    file_type: str = Form("image")
):
    """Загрузка медиафайла"""
    try:
        # Проверяем тип файла
        allowed_types = {
            "image": ["image/jpeg", "image/png", "image/gif", "image/webp"],
            "sticker": ["image/webp", "application/x-tgsticker"],
            "audio": ["audio/mpeg", "audio/ogg", "audio/wav"],
            "video": ["video/mp4", "video/webm", "video/mov"],
            "document": ["application/pdf", "text/plain"]
        }
        
        if file.content_type not in allowed_types.get(file_type, []):
            raise HTTPException(status_code=400, detail=f"Unsupported file type for {file_type}")
        
        # Генерируем имя файла
        file_extension = Path(file.filename).suffix
        new_filename = f"{uuid.uuid4()}{file_extension}"
        file_path = UPLOADS_DIR / new_filename
        
        # Сохраняем файл
        async with aiofiles.open(file_path, 'wb') as f:
            content = await file.read()
            await f.write(content)
        
        file_size = len(content)
        
        # Получаем размеры для изображений
        width, height, duration = None, None, None
        if file_type == "image":
            try:
                with PILImage.open(file_path) as img:
                    width, height = img.size
            except Exception as e:
                logger.warning(f"Could not get image dimensions: {e}")
        
        # Создаем запись в БД
        media_file = MediaFile(
            filename=new_filename,
            original_filename=file.filename,
            file_path=str(file_path),
            file_size=file_size,
            mime_type=file.content_type,
            file_type=file_type,
            width=width,
            height=height,
            duration=duration,
            tags=tags.split(",") if tags else []
        )
        
        await db.media_files.insert_one(media_file.dict())
        
        return APIResponse(
            success=True,
            message="File uploaded successfully",
            data=media_file.dict()
        )
        
    except Exception as e:
        logger.error(f"Media upload error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.get("/media", response_model=List[MediaFile])
async def get_media_files(
    file_type: Optional[str] = None,
    tags: Optional[str] = None,
    limit: int = 50
):
    """Получение списка медиафайлов"""
    query = {"is_active": True}
    
    if file_type:
        query["file_type"] = file_type
    
    if tags:
        tag_list = tags.split(",")
        query["tags"] = {"$in": tag_list}
    
    files = await db.media_files.find(query).limit(limit).to_list(limit)
    return [MediaFile(**file) for file in files]


@api_router.delete("/media/{file_id}")
async def delete_media_file(file_id: str):
    """Удаление медиафайла"""
    try:
        # Найдем файл
        file_doc = await db.media_files.find_one({"id": file_id})
        if not file_doc:
            raise HTTPException(status_code=404, detail="File not found")
        
        # Удалим файл с диска
        file_path = Path(file_doc["file_path"])
        if file_path.exists():
            file_path.unlink()
        
        # Удалим из БД
        await db.media_files.delete_one({"id": file_id})
        
        return APIResponse(success=True, message="File deleted successfully")
        
    except Exception as e:
        logger.error(f"Media delete error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# RULE TEMPLATES ENDPOINTS
@api_router.get("/templates", response_model=List[RuleTemplate])
async def get_rule_templates():
    """Получение шаблонов правил"""
    templates = await db.rule_templates.find().to_list(100)
    return [RuleTemplate(**template) for template in templates]


@api_router.post("/templates", response_model=RuleTemplate)
async def create_rule_template(template_data: dict):
    """Создание шаблона правила"""
    template = RuleTemplate(
        name=template_data["name"],
        template_text=template_data["template_text"],
        variables=template_data.get("variables", {})
    )
    await db.rule_templates.insert_one(template.dict())
    return template


# CALLBACK QUERY ENDPOINTS
@api_router.post("/callbacks/process")
async def process_callback_query(callback_data: dict):
    """Обработка callback запроса от инлайн кнопки"""
    try:
        callback = CallbackQuery(
            callback_data=callback_data["data"],
            user_id=callback_data["user_id"],
            chat_id=callback_data["chat_id"],
            message_id=callback_data["message_id"]
        )
        
        await db.callback_queries.insert_one(callback.dict())
        
        # Здесь будет логика обработки callback
        # userbot_manager.process_callback(callback)
        
        return APIResponse(
            success=True,
            message="Callback processed",
            data=callback.dict()
        )
        
    except Exception as e:
        logger.error(f"Callback processing error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# RULE STATISTICS ENDPOINTS
@api_router.get("/rules/{rule_id}/stats")
async def get_rule_statistics(rule_id: str, days: int = 7):
    """Получение статистики по правилу"""
    start_date = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0) - timedelta(days=days)
    
    stats = await db.rule_statistics.find({
        "rule_id": rule_id,
        "date": {"$gte": start_date}
    }).to_list(days)
    
    return [RuleStatistics(**stat) for stat in stats]


@api_router.get("/system/notifications")
async def get_system_notifications():
    """Получение системных уведомлений"""
    notifications = await db.system_notifications.find({
        "is_read": False,
        "$or": [
            {"expires_at": None},
            {"expires_at": {"$gt": datetime.utcnow()}}
        ]
    }).sort("created_at", -1).to_list(10)
    
    return [SystemNotification(**notif) for notif in notifications]


@api_router.put("/system/notifications/{notification_id}/read")
async def mark_notification_read(notification_id: str):
    """Отметить уведомление как прочитанное"""
    result = await db.system_notifications.update_one(
        {"id": notification_id},
        {"$set": {"is_read": True}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Notification not found")
    
    return APIResponse(success=True, message="Notification marked as read")

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("startup")
async def startup_event():
    """Инициализация при запуске сервера"""
    logger.info("Starting Telegram Userbot Manager")
    
    # Создаем настройки бота если их нет
    settings = await db.bot_settings.find_one()
    if not settings:
        default_settings = BotSettings()
        await db.bot_settings.insert_one(default_settings.dict())
        logger.info("Created default bot settings")
    
    # Автостарт если включен
    settings = await db.bot_settings.find_one()
    if settings and settings.get("auto_start", False):
        logger.info("Auto-starting userbot...")
        try:
            await userbot_manager.start_all_userbots()
        except Exception as e:
            logger.error(f"Failed to auto-start userbot: {e}")

@app.on_event("shutdown")
async def shutdown_event():
    """Очистка при завершении работы сервера"""
    logger.info("Shutting down Telegram Userbot Manager")
    await userbot_manager.stop_all_userbots()
    client.close()