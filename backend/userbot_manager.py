import asyncio
import os
import logging
import uuid
from typing import Dict, Optional, List
from pyrogram import Client, filters
from pyrogram.types import Message
from pyrogram.errors import SessionPasswordNeeded, PhoneCodeInvalid, PhoneNumberInvalid
import random
from datetime import datetime, timedelta
from motor.motor_asyncio import AsyncIOMotorClient
from models import (
    TelegramAccount, AutoReplyRule, BotImage, BotSettings, BotActivityLog,
    AccountStatus, BotStatus, PhoneVerification, TwoFactorAuth,
    MediaContent, InlineButton, ReplyAction, ReplyCondition, ChatFilter,
    RuleStatistics, CallbackQuery
)

logger = logging.getLogger(__name__)


class UserbotManager:
    def __init__(self, db):
        self.db = db
        self.clients: Dict[str, Client] = {}
        self.is_running = False
        self.tasks: List[asyncio.Task] = []
        
        # Connection and session management
        self._verification_clients: Dict[str, Client] = {}
        self._connection_pool_size = 10
        self._bulk_operation_batch_size = 100
        
        # Performance optimization caches
        self._rules_cache: Dict[str, List[AutoReplyRule]] = {}
        self._rules_cache_ttl: Dict[str, datetime] = {}
        self._cache_ttl_seconds = 300  # 5 minutes
        
    async def start_userbot(self, account_id: str) -> bool:
        """Запуск userbot для конкретного аккаунта"""
        try:
            account = await self.get_account_by_id(account_id)
            if not account or not account.session_string:
                logger.error(f"Account {account_id} not found or missing session")
                return False
                
            if account_id in self.clients:
                logger.info(f"Client for account {account_id} already running")
                return True
                
            client = Client(
                name=f"userbot_{account_id}",
                session_string=account.session_string,
                in_memory=True
            )
            
            # Регистрируем обработчик сообщений
            @client.on_message(filters.private & ~filters.me & ~filters.bot)
            async def handle_private_message(client: Client, message: Message):
                await self.process_incoming_message(client, message, account_id)
            
            @client.on_message(filters.group & ~filters.me)
            async def handle_group_message(client: Client, message: Message):
                await self.process_incoming_message(client, message, account_id)
            
            # Регистрируем обработчик callback запросов
            @client.on_callback_query()
            async def handle_callback_query(client: Client, callback_query):
                await self.process_callback_query({
                    "data": callback_query.data,
                    "user_id": str(callback_query.from_user.id),
                    "chat_id": str(callback_query.message.chat.id),
                    "message_id": callback_query.message.id
                })
                
            await client.start()
            self.clients[account_id] = client
            
            # Обновляем статус аккаунта
            await self.update_account_status(account_id, AccountStatus.CONNECTED)
            
            logger.info(f"Userbot started for account {account_id}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to start userbot for account {account_id}: {e}")
            await self.update_account_status(account_id, AccountStatus.ERROR, str(e))
            return False
    
    async def stop_userbot(self, account_id: str) -> bool:
        """Остановка userbot для конкретного аккаунта"""
        try:
            if account_id in self.clients:
                client = self.clients.pop(account_id)
                await client.stop()
                await self.update_account_status(account_id, AccountStatus.DISCONNECTED)
                logger.info(f"Userbot stopped for account {account_id}")
                return True
            return False
        except Exception as e:
            logger.error(f"Failed to stop userbot for account {account_id}: {e}")
            return False
    
    async def start_all_userbots(self) -> Dict[str, bool]:
        """Запуск всех активных userbot"""
        results = {}
        accounts = await self.get_all_active_accounts()
        
        for account in accounts:
            results[account.id] = await self.start_userbot(account.id)
            
        # Обновляем общий статус бота
        settings = await self.get_bot_settings()
        if any(results.values()):
            await self.update_bot_status(BotStatus.RUNNING)
        else:
            await self.update_bot_status(BotStatus.ERROR)
            
        self.is_running = True
        return results
    
    async def stop_all_userbots(self) -> Dict[str, bool]:
        """Остановка всех userbot"""
        results = {}
        
        for account_id in list(self.clients.keys()):
            results[account_id] = await self.stop_userbot(account_id)
            
        await self.update_bot_status(BotStatus.STOPPED)
        self.is_running = False
        return results
    
    async def process_incoming_message(self, client: Client, message: Message, account_id: str):
        """Обработка входящего сообщения с расширенным функционалом"""
        try:
            # Проверяем общие настройки бота
            settings = await self.get_bot_settings()
            if not settings or settings.status != BotStatus.RUNNING:
                return
                
            # Проверяем лимиты
            if not await self.check_daily_limits(settings):
                return
                
            # Проверяем черные/белые списки
            if not await self.check_user_permissions(message.from_user.id, settings):
                return
                
            # Получаем правила автоответов
            rules = await self.get_active_rules(account_id)
            
            # Находим подходящее правило с расширенной проверкой
            matching_rule = await self.find_matching_rule(message, rules, use_enhanced=True)
            
            if matching_rule:
                await self.execute_enhanced_rule_actions(client, message, matching_rule, account_id)
                
        except Exception as e:
            logger.error(f"Error processing message: {e}")
    
    async def find_matching_rule(self, message: Message, rules: List[AutoReplyRule], use_enhanced: bool = True) -> Optional[AutoReplyRule]:
        """Поиск подходящего правила с возможностью использования расширенных или базовых условий"""
        # Сортируем правила по приоритету
        sorted_rules = sorted(rules, key=lambda x: x.priority, reverse=True)
        
        for rule in sorted_rules:
            # Выбираем метод проверки условий
            condition_check = (
                self.check_enhanced_rule_conditions if use_enhanced 
                else self.check_basic_rule_conditions
            )
            
            if await condition_check(message, rule):
                return rule
                
        return None
    
    async def check_basic_rule_conditions(self, message: Message, rule: AutoReplyRule) -> bool:
        """Базовая проверка условий правила (для обратной совместимости)"""
        for condition in rule.conditions:
            if not condition.is_active:
                continue
                
            if condition.condition_type == "all":
                continue  # Условие "все" всегда истинно
                
            elif condition.condition_type == "chat_type":
                chat_type = "private" if message.chat.type.name == "PRIVATE" else message.chat.type.name.lower()
                if hasattr(condition, 'value') and chat_type != condition.value:
                    return False
                    
            elif condition.condition_type == "user_id":
                if hasattr(condition, 'value') and str(message.from_user.id) != condition.value:
                    return False
                    
            elif condition.condition_type == "username":
                if hasattr(condition, 'value') and (not message.from_user.username or message.from_user.username != condition.value):
                    return False
                    
            elif condition.condition_type == "keyword":
                if hasattr(condition, 'value') and (not message.text or condition.value.lower() not in message.text.lower()):
                    return False
                    
        return True
    
    async def execute_rule_actions(self, client: Client, message: Message, rule: AutoReplyRule, account_id: str):
        """Выполнение действий правила"""
        try:
            for action in rule.actions:
                # Добавляем задержку если указана
                if action.delay_seconds > 0:
                    await asyncio.sleep(action.delay_seconds)
                
                if action.action_type == "send_image":
                    await self.send_images(client, message, action.image_ids)
                    
                elif action.action_type == "send_text":
                    if action.text_message:
                        await client.send_message(message.chat.id, action.text_message)
                        
                elif action.action_type == "send_both":
                    if action.text_message:
                        await client.send_message(message.chat.id, action.text_message)
                    await self.send_images(client, message, action.image_ids)
            
            # Логируем активность
            await self.log_bot_activity(
                account_id=account_id,
                chat_id=message.chat.id,
                chat_type=message.chat.type.name.lower(),
                user_id=message.from_user.id,
                username=message.from_user.username,
                first_name=message.from_user.first_name,
                message_text=message.text[:100] if message.text else None,
                rule_id=rule.id,
                action_taken=f"Executed rule: {rule.name}",
                success=True
            )
            
            # Увеличиваем счетчики
            await self.increment_rule_usage(rule.id)
            await self.increment_daily_response_count()
            
        except Exception as e:
            logger.error(f"Error executing rule actions: {e}")
            await self.log_bot_activity(
                account_id=account_id,
                chat_id=message.chat.id,
                chat_type=message.chat.type.name.lower(),
                user_id=message.from_user.id,
                username=message.from_user.username,
                first_name=message.from_user.first_name,
                message_text=message.text[:100] if message.text else None,
                rule_id=rule.id,
                action_taken=f"Failed to execute rule: {rule.name}",
                success=False,
                error_message=str(e)
            )
    
    async def send_images(self, client: Client, message: Message, image_ids: List[str]):
        """Отправка картинок"""
        for image_id in image_ids:
            image = await self.get_image_by_id(image_id)
            if image and image.is_active:
                try:
                    await client.send_photo(message.chat.id, image.file_path)
                except Exception as e:
                    logger.error(f"Failed to send image {image_id}: {e}")
    
    # Методы для работы с базой данных
    async def get_account_by_id(self, account_id: str) -> Optional[TelegramAccount]:
        """Получение аккаунта по ID"""
        account_data = await self.db.telegram_accounts.find_one({"id": account_id})
        return TelegramAccount(**account_data) if account_data else None
    
    async def get_all_active_accounts(self) -> List[TelegramAccount]:
        """Получение всех активных аккаунтов"""
        accounts_data = await self.db.telegram_accounts.find(
            {"status": {"$ne": AccountStatus.ERROR}, "session_string": {"$ne": None}}
        ).to_list(100)
        return [TelegramAccount(**account) for account in accounts_data]
    
    async def update_account_status(self, account_id: str, status: AccountStatus, error_message: str = None):
        """Обновление статуса аккаунта"""
        update_data = {"status": status, "last_active": datetime.utcnow()}
        if error_message:
            update_data["error_message"] = error_message
        elif status == AccountStatus.CONNECTED:
            update_data["error_message"] = None
            
        await self.db.telegram_accounts.update_one(
            {"id": account_id},
            {"$set": update_data}
        )
    

    async def update_bot_status(self, status: BotStatus):
        """Обновление статуса бота"""
        await self.db.bot_settings.update_one(
            {},
            {"$set": {"status": status, "updated_at": datetime.utcnow()}},
            upsert=True
        )
    
    async def get_active_rules(self, account_id: Optional[str] = None) -> List[AutoReplyRule]:
        """Получение активных правил с кэшированием"""
        cache_key = f"rules_{account_id or 'all'}"
        
        # Проверяем кэш
        if (cache_key in self._rules_cache and 
            cache_key in self._rules_cache_ttl and 
            datetime.utcnow() < self._rules_cache_ttl[cache_key]):
            return self._rules_cache[cache_key]
        
        # Загружаем из базы данных
        query = {"is_active": True}
        if account_id:
            query["account_id"] = account_id
        
        rules_docs = await self.db.auto_reply_rules.find(query).to_list(1000)
        rules = [AutoReplyRule(**rule) for rule in rules_docs]
        
        # Сохраняем в кэш
        self._rules_cache[cache_key] = rules
        self._rules_cache_ttl[cache_key] = datetime.utcnow() + timedelta(seconds=self._cache_ttl_seconds)
        
        return rules
    
    async def clear_rules_cache(self, account_id: Optional[str] = None):
        """Очистка кэша правил"""
        if account_id:
            cache_key = f"rules_{account_id}"
            self._rules_cache.pop(cache_key, None)
            self._rules_cache_ttl.pop(cache_key, None)
        else:
            # Очищаем весь кэш правил
            self._rules_cache.clear()
            self._rules_cache_ttl.clear()
    
    async def get_bot_settings(self) -> Optional[BotSettings]:
        """Получение настроек бота с кэшированием"""
        cache_key = "bot_settings"
        
        # Проверяем кэш (короткий TTL для настроек)
        if (hasattr(self, '_settings_cache') and 
            hasattr(self, '_settings_cache_time') and
            datetime.utcnow() < self._settings_cache_time):
            return self._settings_cache
        
        settings_doc = await self.db.bot_settings.find_one()
        settings = BotSettings(**settings_doc) if settings_doc else None
        
        # Кэшируем на 30 секунд
        self._settings_cache = settings
        self._settings_cache_time = datetime.utcnow() + timedelta(seconds=30)
        
        return settings
        
    async def bulk_log_activities(self, activities: List[BotActivityLog]):
        """Массовое логирование активности для улучшения производительности"""
        if not activities:
            return
            
        # Разбиваем на батчи
        for i in range(0, len(activities), self._bulk_operation_batch_size):
            batch = activities[i:i + self._bulk_operation_batch_size]
            batch_docs = [activity.dict() for activity in batch]
            
            try:
                await self.db.bot_activity_logs.insert_many(batch_docs, ordered=False)
            except Exception as e:
                logger.error(f"Bulk activity logging error: {e}")
                # Fallback to individual inserts
                for activity in batch:
                    try:
                        await self.db.bot_activity_logs.insert_one(activity.dict())
                    except Exception as individual_error:
                        logger.error(f"Individual activity logging error: {individual_error}")
    
    def _optimize_query_with_indexes(self, collection_name: str, query: dict) -> dict:
        """Оптимизация запросов для использования индексов"""
        optimized_query = query.copy()
        
        # Добавляем hints для оптимизации запросов
        if collection_name == "auto_reply_rules":
            # Убеждаемся что запросы используют индексы по is_active и priority
            if "is_active" not in optimized_query:
                optimized_query["is_active"] = True
                
        elif collection_name == "media_files":
            # Для медиафайлов добавляем фильтр по активности
            if "is_active" not in optimized_query:
                optimized_query["is_active"] = True
        
        return optimized_query
    
    async def get_image_by_id(self, image_id: str) -> Optional[BotImage]:
        """Получение картинки по ID"""
        image_data = await self.db.bot_images.find_one({"id": image_id})
        return BotImage(**image_data) if image_data else None
    
    async def check_daily_limits(self, settings: BotSettings) -> bool:
        """Проверка дневных лимитов"""
        # Проверяем, нужно ли сбросить счетчик
        today = datetime.utcnow().date()
        if settings.last_reset_date.date() != today:
            await self.db.bot_settings.update_one(
                {"id": settings.id},
                {"$set": {"daily_response_count": 0, "last_reset_date": datetime.utcnow()}}
            )
            return True
            
        return settings.daily_response_count < settings.max_daily_responses
    
    async def check_user_permissions(self, user_id: int, settings: BotSettings) -> bool:
        """Проверка разрешений пользователя"""
        user_id_str = str(user_id)
        
        # Проверяем черный список
        if user_id_str in settings.blacklisted_users:
            return False
            
        # Проверяем белый список (если не пустой)
        if settings.whitelisted_users and user_id_str not in settings.whitelisted_users:
            return False
            
        return True
    
    async def log_bot_activity(self, **kwargs):
        """Логирование активности бота"""
        log_entry = BotActivityLog(**kwargs)
        await self.db.bot_activity_logs.insert_one(log_entry.dict())
    
    async def increment_rule_usage(self, rule_id: str):
        """Увеличение счетчика использования правила"""
        await self.db.auto_reply_rules.update_one(
            {"id": rule_id},
            {"$inc": {"usage_count": 1}}
        )
    
    async def increment_daily_response_count(self):
        """Увеличение счетчика дневных ответов"""
        await self.db.bot_settings.update_one(
            {},
            {"$inc": {"daily_response_count": 1}},
            upsert=True
        )

    # Методы для аутентификации
    # Dictionary to store temporary clients during verification process
    _verification_clients = {}
    
    async def send_code_request(self, phone: str, api_id: int, api_hash: str) -> str:
        """Отправка запроса на код подтверждения"""
        try:
            verification_id = str(uuid.uuid4())
            client_name = f"temp_{verification_id}"
            
            # Create client that we'll reuse for verification
            client = Client(client_name, api_id=api_id, api_hash=api_hash, in_memory=True)
            await client.connect()
            
            sent_code = await client.send_code(phone)
            
            # Store client for later use in verification
            self._verification_clients[verification_id] = client
            
            # Сохраняем информацию о верификации
            verification = PhoneVerification(
                id=verification_id,
                phone=phone,
                api_id=api_id,
                api_hash=api_hash,
                phone_code_hash=sent_code.phone_code_hash,
                expires_at=datetime.utcnow() + timedelta(minutes=10)  # Увеличил время до 10 минут
            )
            
            await self.db.phone_verifications.insert_one(verification.dict())
            
            # Clean up old verification clients (older than 15 minutes)
            await self._cleanup_old_verification_clients()
            
            return verification_id
            
        except Exception as e:
            logger.error(f"Failed to send code request: {e}")
            # Clean up client if something went wrong
            if verification_id in self._verification_clients:
                try:
                    await self._verification_clients[verification_id].disconnect()
                except:
                    pass
                del self._verification_clients[verification_id]
            raise
    
    async def verify_phone_code(self, verification_id: str, code: str) -> str:
        """Верификация кода и получение session string"""
        try:
            # Получаем данные верификации
            verification_data = await self.db.phone_verifications.find_one({"id": verification_id})
            if not verification_data:
                raise ValueError("Verification not found")
                
            verification = PhoneVerification(**verification_data)
            
            # Проверяем срок действия
            if datetime.utcnow() > verification.expires_at:
                # Очищаем клиент если истек срок
                if verification_id in self._verification_clients:
                    try:
                        await self._verification_clients[verification_id].disconnect()
                    except:
                        pass
                    del self._verification_clients[verification_id]
                raise ValueError("Verification code expired. Please request a new code.")
            
            # Получаем существующий клиент или создаем новый
            if verification_id in self._verification_clients:
                client = self._verification_clients[verification_id]
                # Проверяем, что клиент еще подключен
                if not client.is_connected:
                    await client.connect()
            else:
                # Если клиент не найден, создаем новый (fallback)
                logger.warning(f"Client not found for verification {verification_id}, creating new one")
                client = Client(
                    f"temp_{verification_id}",
                    api_id=verification.api_id,
                    api_hash=verification.api_hash,
                    in_memory=True
                )
                await client.connect()
                self._verification_clients[verification_id] = client
            
            try:
                # Очищаем код от пробелов и лишних символов
                clean_code = code.strip().replace(" ", "").replace("-", "")
                
                # Выполняем аутентификацию
                signed_in = await client.sign_in(verification.phone, verification.phone_code_hash, clean_code)
                logger.info(f"Successfully signed in user: {signed_in.user.phone_number}")
                
            except SessionPasswordNeeded:
                # Если требуется 2FA пароль - не отключаем клиент, оставляем для 2FA
                # Обновляем статус верификации - код верифицирован, но нужен 2FA
                await self.db.phone_verifications.update_one(
                    {"id": verification_id},
                    {"$set": {
                        "code_verified": True, 
                        "requires_2fa": True,
                        "updated_at": datetime.utcnow()
                    }}
                )
                # Возвращаем специальный код, указывающий на необходимость 2FA
                return "2FA_REQUIRED"
            except Exception as auth_error:
                # Улучшенная обработка ошибок аутентификации
                error_msg = str(auth_error).lower()
                if "phone_code_expired" in error_msg:
                    raise ValueError("The verification code has expired. Please request a new code.")
                elif "phone_code_invalid" in error_msg:
                    raise ValueError("Invalid verification code. Please check and try again.")
                elif "phone_code_empty" in error_msg:
                    raise ValueError("Please enter the verification code.")
                elif "flood_wait" in error_msg:
                    raise ValueError("Too many requests. Please wait a few minutes and try again.")
                else:
                    logger.error(f"Authentication error: {auth_error}")
                    raise ValueError(f"Authentication failed: {auth_error}")
            
            # Получаем session string
            session_string = await client.export_session_string()
            
            # Отключаем и очищаем клиент
            await client.disconnect()
            if verification_id in self._verification_clients:
                del self._verification_clients[verification_id]
            
            # Помечаем верификацию как завершенную
            await self.db.phone_verifications.update_one(
                {"id": verification_id},
                {"$set": {"is_verified": True, "verified_at": datetime.utcnow()}}
            )
            
            return session_string
            
        except Exception as e:
            # Очистка при ошибке
            if verification_id in self._verification_clients:
                try:
                    await self._verification_clients[verification_id].disconnect()
                except:
                    pass
                del self._verification_clients[verification_id]
            
            logger.error(f"Failed to verify phone code: {e}")
            raise
    
    async def verify_2fa_password(self, verification_id: str, password: str) -> str:
        """Верификация 2FA пароля и получение session string"""
        try:
            # Получаем данные верификации
            verification_data = await self.db.phone_verifications.find_one({"id": verification_id})
            if not verification_data:
                raise ValueError("Verification not found")
                
            verification = PhoneVerification(**verification_data)
            
            # Проверяем, что код был верифицирован и требуется 2FA
            if not verification.code_verified or not verification.requires_2fa:
                raise ValueError("Invalid verification state. Please start the verification process again.")
            
            # Проверяем срок действия
            if datetime.utcnow() > verification.expires_at:
                if verification_id in self._verification_clients:
                    try:
                        await self._verification_clients[verification_id].disconnect()
                    except:
                        pass
                    del self._verification_clients[verification_id]
                raise ValueError("Verification session expired. Please start the verification process again.")
            
            # Получаем существующий клиент
            if verification_id not in self._verification_clients:
                raise ValueError("Verification session not found. Please start the verification process again.")
            
            client = self._verification_clients[verification_id]
            
            # Проверяем, что клиент еще подключен
            if not client.is_connected:
                await client.connect()
            
            try:
                # Выполняем 2FA аутентификацию
                signed_in = await client.check_password(password)
                logger.info(f"Successfully signed in user with 2FA: {signed_in.phone_number}")
                
            except Exception as auth_error:
                # Обработка ошибок 2FA
                error_msg = str(auth_error).lower()
                if "password_hash_invalid" in error_msg:
                    raise ValueError("Invalid 2FA password. Please check and try again.")
                elif "flood_wait" in error_msg:
                    raise ValueError("Too many requests. Please wait a few minutes and try again.")
                else:
                    logger.error(f"2FA authentication error: {auth_error}")
                    raise ValueError(f"2FA authentication failed: {auth_error}")
            
            # Получаем session string
            session_string = await client.export_session_string()
            
            # Отключаем и очищаем клиент
            await client.disconnect()
            if verification_id in self._verification_clients:
                del self._verification_clients[verification_id]
            
            # Помечаем верификацию как завершенную
            await self.db.phone_verifications.update_one(
                {"id": verification_id},
                {"$set": {"is_verified": True, "verified_at": datetime.utcnow()}}
            )
            
            return session_string
            
        except Exception as e:
            # Очистка при ошибке
            if verification_id in self._verification_clients:
                try:
                    await self._verification_clients[verification_id].disconnect()
                except:
                    pass
                del self._verification_clients[verification_id]
            
            logger.error(f"Failed to verify 2FA password: {e}")
            raise
    
    # ENHANCED METHODS FOR NEW CONTENT TYPES
    
    async def check_enhanced_rule_conditions(self, message: Message, rule: AutoReplyRule) -> bool:
        """Расширенная проверка условий правила"""
        from datetime import time
        
        for condition in rule.conditions:
            if not condition.is_active:
                continue
                
            # Проверка фильтра чатов
            if condition.condition_type == "chat_filter" and condition.chat_filter:
                chat_filter = condition.chat_filter
                
                # Проверка типа чата
                if chat_filter.chat_types:
                    chat_type = self._get_chat_type(message)
                    if chat_type not in chat_filter.chat_types:
                        return False
                
                # Проверка белого списка чатов
                if chat_filter.whitelist_chats:
                    if str(message.chat.id) not in chat_filter.whitelist_chats:
                        return False
                
                # Проверка черного списка чатов
                if chat_filter.blacklist_chats:
                    if str(message.chat.id) in chat_filter.blacklist_chats:
                        return False
                
                # Проверка названия чата
                if chat_filter.chat_title_contains:
                    chat_title = getattr(message.chat, 'title', '') or ''
                    if chat_filter.chat_title_contains.lower() not in chat_title.lower():
                        return False
                
                # Проверка количества участников (для групп)
                if hasattr(message.chat, 'members_count'):
                    members_count = message.chat.members_count
                    if chat_filter.min_members and members_count < chat_filter.min_members:
                        return False
                    if chat_filter.max_members and members_count > chat_filter.max_members:
                        return False
            
            # Проверка фильтра пользователей
            elif condition.condition_type == "user_filter":
                if condition.user_ids:
                    if str(message.from_user.id) not in condition.user_ids:
                        return False
                
                if condition.usernames:
                    username = message.from_user.username or ""
                    if username not in condition.usernames:
                        return False
            
            # Проверка фильтра сообщений
            elif condition.condition_type == "message_filter":
                # Проверка ключевых слов
                if condition.keywords:
                    message_text = message.text or message.caption or ""
                    if not any(keyword.lower() in message_text.lower() for keyword in condition.keywords):
                        return False
                
                # Проверка типа сообщения
                if condition.message_types:
                    message_type = self._get_message_type(message)
                    if message_type not in condition.message_types:
                        return False
            
            # Проверка временных рамок
            elif condition.condition_type == "time_filter":
                current_time = datetime.utcnow()
                for time_range in condition.time_ranges:
                    start_hour = time_range.get("start_hour", 0)
                    end_hour = time_range.get("end_hour", 23)
                    days_of_week = time_range.get("days_of_week", [0,1,2,3,4,5,6])
                    
                    if current_time.weekday() not in days_of_week:
                        continue
                    
                    current_hour = current_time.hour
                    if start_hour <= current_hour <= end_hour:
                        break
                else:
                    return False
                    
        return True
    
    async def execute_enhanced_rule_actions(self, client: Client, message: Message, rule: AutoReplyRule, account_id: str):
        """Выполнение расширенных действий правила"""
        try:
            # Проверка кулдауна
            if rule.cooldown_seconds > 0:
                last_triggered = rule.last_triggered
                if last_triggered:
                    time_since_last = (datetime.utcnow() - last_triggered).total_seconds()
                    if time_since_last < rule.cooldown_seconds:
                        return
            
            # Проверка дневного лимита
            if rule.max_triggers_per_day:
                today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
                today_triggers = await self.db.bot_activity_logs.count_documents({
                    "rule_id": rule.id,
                    "timestamp": {"$gte": today_start}
                })
                if today_triggers >= rule.max_triggers_per_day:
                    return
            
            # Обработка условных правил
            for conditional_rule in rule.conditional_rules:
                if await self.check_enhanced_rule_conditions(message, AutoReplyRule(
                    id="temp", name="temp", conditions=[conditional_rule.condition]
                )):
                    await self._execute_single_action(client, message, conditional_rule.if_action, rule.id)
                elif conditional_rule.else_action:
                    await self._execute_single_action(client, message, conditional_rule.else_action, rule.id)
                continue
            
            # Обработка обычных действий
            for action in rule.actions:
                await self._execute_single_action(client, message, action, rule.id)
            
            # Обновляем статистику правила
            await self._update_rule_statistics(rule.id, account_id, True)
            
            # Обновляем время последнего срабатывания
            await self.db.auto_reply_rules.update_one(
                {"id": rule.id},
                {
                    "$set": {"last_triggered": datetime.utcnow()},
                    "$inc": {"usage_count": 1, "success_count": 1}
                }
            )
            
        except Exception as e:
            logger.error(f"Error executing enhanced rule actions: {e}")
            await self._update_rule_statistics(rule.id, account_id, False)
            await self.db.auto_reply_rules.update_one(
                {"id": rule.id},
                {"$inc": {"error_count": 1}}
            )
    
    async def _execute_single_action(self, client: Client, message: Message, action, rule_id: str):
        """Выполнение одного действия"""
        try:
            # Добавляем задержку
            if action.delay_seconds > 0:
                await asyncio.sleep(action.delay_seconds)
            
            # Отправляем медиа контент
            keyboard = None
            if action.inline_buttons:
                keyboard = await self._create_inline_keyboard(action.inline_buttons, rule_id)
            
            for media_content in action.media_contents:
                if media_content.content_type == "text":
                    text = await self._process_template_text(media_content.text_content or "", message)
                    sent_message = await client.send_message(
                        message.chat.id, 
                        text, 
                        reply_markup=keyboard,
                        reply_to_message_id=message.id if action.reply_to_message else None
                    )
                
                elif media_content.content_type == "image":
                    caption = await self._process_template_text(media_content.caption or "", message)
                    sent_message = await client.send_photo(
                        message.chat.id,
                        media_content.file_path,
                        caption=caption if caption else None,
                        reply_markup=keyboard,
                        reply_to_message_id=message.id if action.reply_to_message else None
                    )
                
                elif media_content.content_type == "sticker":
                    sent_message = await client.send_sticker(
                        message.chat.id,
                        media_content.file_id or media_content.file_path,
                        reply_to_message_id=message.id if action.reply_to_message else None
                    )
                
                elif media_content.content_type == "emoji":
                    # Для эмодзи используем обычное текстовое сообщение
                    sent_message = await client.send_message(
                        message.chat.id,
                        media_content.emoji,
                        reply_to_message_id=message.id if action.reply_to_message else None
                    )
                
                # Автоудаление сообщения
                if action.delete_after_seconds and hasattr(sent_message, 'id'):
                    asyncio.create_task(self._delete_message_after_delay(
                        client, message.chat.id, sent_message.id, action.delete_after_seconds
                    ))
            
            # Добавляем реакции
            for reaction in action.reactions:
                try:
                    await client.send_reaction(message.chat.id, message.id, reaction)
                except Exception as e:
                    logger.warning(f"Failed to add reaction {reaction}: {e}")
                    
        except Exception as e:
            logger.error(f"Error executing single action: {e}")
            raise
    
    async def _create_inline_keyboard(self, button_rows, rule_id: str):
        """Создание инлайн клавиатуры"""
        from pyrogram.types import InlineKeyboardMarkup, InlineKeyboardButton
        
        keyboard_rows = []
        for row in button_rows:
            keyboard_row = []
            for button in row:
                if button.button_type == "url":
                    keyboard_row.append(InlineKeyboardButton(button.text, url=button.url))
                elif button.button_type == "callback":
                    callback_data = f"{rule_id}:{button.callback_data}"
                    keyboard_row.append(InlineKeyboardButton(button.text, callback_data=callback_data))
            keyboard_rows.append(keyboard_row)
        
        return InlineKeyboardMarkup(keyboard_rows)
    
    async def _process_template_text(self, template_text: str, message: Message) -> str:
        """Обработка шаблонного текста с переменными"""
        if not template_text:
            return ""
        
        variables = {
            "{user_name}": message.from_user.first_name or "Пользователь",
            "{user_id}": str(message.from_user.id),
            "{username}": f"@{message.from_user.username}" if message.from_user.username else "без username",
            "{chat_title}": getattr(message.chat, 'title', '') or 'Личные сообщения',
            "{chat_id}": str(message.chat.id),
            "{time}": datetime.utcnow().strftime("%H:%M"),
            "{date}": datetime.utcnow().strftime("%d.%m.%Y"),
            "{message_text}": message.text or message.caption or ""
        }
        
        processed_text = template_text
        for var, value in variables.items():
            processed_text = processed_text.replace(var, value)
        
        return processed_text
    
    async def _delete_message_after_delay(self, client: Client, chat_id: int, message_id: int, delay: int):
        """Удаление сообщения через указанное время"""
        await asyncio.sleep(delay)
        try:
            await client.delete_messages(chat_id, message_id)
        except Exception as e:
            logger.warning(f"Failed to delete message {message_id}: {e}")
    
    async def _update_rule_statistics(self, rule_id: str, account_id: str, success: bool):
        """Обновление статистики правила"""
        try:
            today = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
            
            # Обновляем или создаем статистику за день
            await self.db.rule_statistics.update_one(
                {"rule_id": rule_id, "date": today},
                {
                    "$inc": {
                        "triggers_count": 1,
                        "success_count": 1 if success else 0,
                        "error_count": 0 if success else 1
                    },
                    "$setOnInsert": {
                        "rule_id": rule_id,
                        "date": today,
                        "avg_response_time": 0.0,
                        "most_active_chat": None,
                        "most_active_user": None
                    }
                },
                upsert=True
            )
        except Exception as e:
            logger.error(f"Error updating rule statistics: {e}")
    
    def _get_chat_type(self, message: Message) -> str:
        """Получение типа чата"""
        chat_type_map = {
            "PRIVATE": "private",
            "GROUP": "group", 
            "SUPERGROUP": "supergroup",
            "CHANNEL": "channel"
        }
        return chat_type_map.get(message.chat.type.name, "unknown")
    
    def _get_message_type(self, message: Message) -> str:
        """Определение типа сообщения"""
        if message.text:
            return "text"
        elif message.photo:
            return "photo"
        elif message.video:
            return "video"
        elif message.document:
            return "document"
        elif message.audio:
            return "audio"
        elif message.voice:
            return "voice"
        elif message.sticker:
            return "sticker"
        elif message.animation:
            return "animation"
        else:
            return "other"
    
    async def process_callback_query(self, callback_query_data: Dict):
        """Обработка callback запроса от инлайн кнопки"""
        try:
            callback_data = callback_query_data.get("data", "")
            user_id = callback_query_data.get("user_id")
            chat_id = callback_query_data.get("chat_id")
            
            # Парсим callback данные
            if ":" not in callback_data:
                return
            
            rule_id, action_data = callback_data.split(":", 1)
            
            # Найдем правило и выполним callback действие
            rule_doc = await self.db.auto_reply_rules.find_one({"id": rule_id})
            if not rule_doc:
                return
            
            rule = AutoReplyRule(**rule_doc)
            
            # Найдем соответствующую кнопку и выполним действие
            for action in rule.actions:
                for button_row in action.inline_buttons:
                    for button in button_row:
                        if button.callback_data == action_data:
                            await self._execute_callback_action(button, chat_id, user_id)
                            return
                            
        except Exception as e:
            logger.error(f"Error processing callback query: {e}")
    
    async def _execute_callback_action(self, button, chat_id: str, user_id: str):
        """Выполнение действия callback кнопки"""
        try:
            # Найдем активный клиент для отправки ответа
            client = None
            for account_id, client_instance in self.clients.items():
                if client_instance.is_connected:
                    client = client_instance
                    break
            
            if not client:
                logger.error("No active client found for callback response")
                return
            
            if button.callback_action == "send_sticker" and button.callback_content:
                await client.send_sticker(chat_id, button.callback_content)
            
            elif button.callback_action == "send_emoji" and button.callback_content:
                await client.send_message(chat_id, button.callback_content)
            
            elif button.callback_action == "send_text" and button.callback_content:
                await client.send_message(chat_id, button.callback_content)
            
            elif button.callback_action == "send_image" and button.callback_content:
                await client.send_photo(chat_id, button.callback_content)
                
        except Exception as e:
            logger.error(f"Error executing callback action: {e}")
    
    async def _cleanup_old_verification_clients(self):
        """Очистка старых клиентов верификации"""
        try:
            current_time = datetime.utcnow()
            expired_verifications = []
            
            # Найти истекшие верификации
            async for verification in self.db.phone_verifications.find({
                "expires_at": {"$lt": current_time},
                "is_verified": False
            }):
                expired_verifications.append(verification["id"])
            
            # Очистить клиенты для истекших верификаций
            for verification_id in expired_verifications:
                if verification_id in self._verification_clients:
                    try:
                        await self._verification_clients[verification_id].disconnect()
                    except:
                        pass
                    del self._verification_clients[verification_id]
                    
            # Удалить истекшие записи из базы данных
            if expired_verifications:
                await self.db.phone_verifications.delete_many({
                    "id": {"$in": expired_verifications}
                })
                logger.info(f"Cleaned up {len(expired_verifications)} expired verification clients")
                
        except Exception as e:
            logger.error(f"Error cleaning up verification clients: {e}")