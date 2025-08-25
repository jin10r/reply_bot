from fastapi import FastAPI, APIRouter, HTTPException, UploadFile, File, Form
from fastapi.staticfiles import StaticFiles
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
import uuid
from datetime import datetime
import aiofiles
import shutil
from PIL import Image as PILImage

from models import (
    TelegramAccount, TelegramAccountCreate, TelegramAccountUpdate,
    AutoReplyRule, AutoReplyRuleCreate, AutoReplyRuleUpdate,
    BotImage, BotImageCreate, BotSettings, BotSettingsUpdate,
    BotActivityLog, PhoneVerification, PhoneVerificationCode,
    TwoFactorAuth, APIResponse, StatusCheck, StatusCheckCreate,
    AccountStatus, BotStatus
)
from userbot_manager import UserbotManager

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

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

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Serve static files
app.mount("/uploads", StaticFiles(directory=str(UPLOADS_DIR)), name="uploads")

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
    """Верификация кода и создание аккаунта"""
    try:
        session_string = await userbot_manager.verify_phone_code(
            verification_data.verification_id, verification_data.code
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

# IMAGES ENDPOINTS
@api_router.get("/images", response_model=List[BotImage])
async def get_images():
    """Получение всех картинок"""
    images = await db.bot_images.find().to_list(1000)
    return [BotImage(**image) for image in images]

@api_router.post("/images/upload")
async def upload_image(
    file: UploadFile = File(...),
    tags: str = Form("")
):
    """Загрузка картинки"""
    # Проверяем тип файла
    allowed_types = ["image/jpeg", "image/png", "image/gif", "image/svg+xml"]
    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=400, 
            detail=f"File type {file.content_type} not allowed"
        )
    
    # Генерируем уникальное имя файла
    file_extension = file.filename.split('.')[-1].lower()
    filename = f"{uuid.uuid4()}.{file_extension}"
    file_path = UPLOADS_DIR / filename
    
    # Сохраняем файл
    async with aiofiles.open(file_path, 'wb') as f:
        content = await file.read()
        await f.write(content)
    
    # Получаем размеры изображения (если не SVG)
    width, height = None, None
    if file.content_type != "image/svg+xml":
        try:
            with PILImage.open(file_path) as img:
                width, height = img.size
        except Exception:
            pass
    
    # Создаем запись в БД
    image = BotImage(
        filename=filename,
        original_filename=file.filename,
        file_path=str(file_path),
        file_size=len(content),
        mime_type=file.content_type,
        width=width,
        height=height,
        tags=tags.split(',') if tags else []
    )
    
    await db.bot_images.insert_one(image.dict())
    return image

@api_router.get("/images/{image_id}", response_model=BotImage)
async def get_image(image_id: str):
    """Получение картинки по ID"""
    image = await db.bot_images.find_one({"id": image_id})
    if not image:
        raise HTTPException(status_code=404, detail="Image not found")
    return BotImage(**image)

@api_router.delete("/images/{image_id}")
async def delete_image(image_id: str):
    """Удаление картинки"""
    image = await db.bot_images.find_one({"id": image_id})
    if not image:
        raise HTTPException(status_code=404, detail="Image not found")
    
    # Удаляем файл
    try:
        os.remove(image["file_path"])
    except OSError:
        pass
    
    # Удаляем запись из БД
    await db.bot_images.delete_one({"id": image_id})
    
    return APIResponse(success=True, message="Image deleted")

# ACTIVITY LOGS ENDPOINTS
@api_router.get("/logs", response_model=List[BotActivityLog])
async def get_activity_logs(limit: int = 100, skip: int = 0):
    """Получение логов активности"""
    logs = await db.bot_activity_logs.find().sort("timestamp", -1).skip(skip).limit(limit).to_list(limit)
    return [BotActivityLog(**log) for log in logs]

@api_router.get("/logs/stats")
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