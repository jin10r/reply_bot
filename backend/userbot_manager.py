import asyncio
import os
import logging
from typing import Dict, Optional, List
from pyrogram import Client, filters
from pyrogram.types import Message
from pyrogram.errors import SessionPasswordNeeded, PhoneCodeInvalid, PhoneNumberInvalid
import random
from datetime import datetime, timedelta
from motor.motor_asyncio import AsyncIOMotorClient
from .models import (
    TelegramAccount, AutoReplyRule, BotImage, BotSettings, BotActivityLog,
    AccountStatus, BotStatus, PhoneVerification
)

logger = logging.getLogger(__name__)


class UserbotManager:
    def __init__(self, db):
        self.db = db
        self.clients: Dict[str, Client] = {}
        self.is_running = False
        self.tasks: List[asyncio.Task] = []
        
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
        """Обработка входящего сообщения"""
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
            
            # Находим подходящее правило
            matching_rule = await self.find_matching_rule(message, rules)
            
            if matching_rule:
                await self.execute_rule_actions(client, message, matching_rule, account_id)
                
        except Exception as e:
            logger.error(f"Error processing message: {e}")
    
    async def find_matching_rule(self, message: Message, rules: List[AutoReplyRule]) -> Optional[AutoReplyRule]:
        """Поиск подходящего правила для срабатывания"""
        # Сортируем правила по приоритету
        sorted_rules = sorted(rules, key=lambda x: x.priority, reverse=True)
        
        for rule in sorted_rules:
            if await self.check_rule_conditions(message, rule):
                return rule
                
        return None
    
    async def check_rule_conditions(self, message: Message, rule: AutoReplyRule) -> bool:
        """Проверка условий правила"""
        for condition in rule.conditions:
            if not condition.is_active:
                continue
                
            if condition.condition_type == "all":
                continue  # Условие "все" всегда истинно
                
            elif condition.condition_type == "chat_type":
                chat_type = "private" if message.chat.type.name == "PRIVATE" else message.chat.type.name.lower()
                if chat_type != condition.value:
                    return False
                    
            elif condition.condition_type == "user_id":
                if str(message.from_user.id) != condition.value:
                    return False
                    
            elif condition.condition_type == "username":
                if not message.from_user.username or message.from_user.username != condition.value:
                    return False
                    
            elif condition.condition_type == "keyword":
                if not message.text or condition.value.lower() not in message.text.lower():
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
    
    async def get_bot_settings(self) -> Optional[BotSettings]:
        """Получение настроек бота"""
        settings_data = await self.db.bot_settings.find_one()
        return BotSettings(**settings_data) if settings_data else None
    
    async def update_bot_status(self, status: BotStatus):
        """Обновление статуса бота"""
        await self.db.bot_settings.update_one(
            {},
            {"$set": {"status": status, "updated_at": datetime.utcnow()}},
            upsert=True
        )
    
    async def get_active_rules(self, account_id: str = None) -> List[AutoReplyRule]:
        """Получение активных правил"""
        query = {"is_active": True}
        if account_id:
            query["$or"] = [{"account_id": account_id}, {"account_id": None}]
            
        rules_data = await self.db.auto_reply_rules.find(query).to_list(1000)
        return [AutoReplyRule(**rule) for rule in rules_data]
    
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
    async def send_code_request(self, phone: str, api_id: int, api_hash: str) -> str:
        """Отправка запроса на код подтверждения"""
        try:
            client = Client(f"temp_{phone}", api_id=api_id, api_hash=api_hash, in_memory=True)
            await client.connect()
            
            sent_code = await client.send_code(phone)
            verification_id = str(uuid.uuid4())
            
            # Сохраняем информацию о верификации
            verification = PhoneVerification(
                id=verification_id,
                phone=phone,
                api_id=api_id,
                api_hash=api_hash,
                phone_code_hash=sent_code.phone_code_hash,
                expires_at=datetime.utcnow() + timedelta(minutes=5)
            )
            
            await self.db.phone_verifications.insert_one(verification.dict())
            await client.disconnect()
            
            return verification_id
            
        except Exception as e:
            logger.error(f"Failed to send code request: {e}")
            raise
    
    async def verify_phone_code(self, verification_id: str, code: str) -> str:
        """Верификация кода и получение session string"""
        try:
            verification_data = await self.db.phone_verifications.find_one({"id": verification_id})
            if not verification_data:
                raise ValueError("Verification not found")
                
            verification = PhoneVerification(**verification_data)
            
            if datetime.utcnow() > verification.expires_at:
                raise ValueError("Verification expired")
            
            client = Client(
                f"temp_{verification.phone}",
                api_id=verification.api_id,
                api_hash=verification.api_hash,
                in_memory=True
            )
            
            await client.connect()
            
            try:
                await client.sign_in(verification.phone, verification.phone_code_hash, code)
            except SessionPasswordNeeded:
                # Если требуется 2FA пароль, пока не поддерживаем
                await client.disconnect()
                raise ValueError("Two-factor authentication not supported yet")
            
            session_string = await client.export_session_string()
            await client.disconnect()
            
            # Помечаем верификацию как завершенную
            await self.db.phone_verifications.update_one(
                {"id": verification_id},
                {"$set": {"is_verified": True}}
            )
            
            return session_string
            
        except Exception as e:
            logger.error(f"Failed to verify phone code: {e}")
            raise