from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime
import uuid
from enum import Enum


class AccountStatus(str, Enum):
    DISCONNECTED = "disconnected"
    CONNECTING = "connecting"
    CONNECTED = "connected"
    ERROR = "error"


class BotStatus(str, Enum):
    STOPPED = "stopped"
    STARTING = "starting"
    RUNNING = "running"
    ERROR = "error"


# Telegram Account Models
class TelegramAccount(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    phone: str
    api_id: Optional[int] = None
    api_hash: Optional[str] = None
    session_string: Optional[str] = None
    status: AccountStatus = AccountStatus.DISCONNECTED
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    username: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    last_active: Optional[datetime] = None
    error_message: Optional[str] = None


class TelegramAccountCreate(BaseModel):
    phone: str
    api_id: int
    api_hash: str


class TelegramAccountUpdate(BaseModel):
    status: Optional[AccountStatus] = None
    session_string: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    username: Optional[str] = None
    last_active: Optional[datetime] = None
    error_message: Optional[str] = None


# Auto Reply Rules Models
class ReplyCondition(BaseModel):
    condition_type: str  # "chat_type", "user_id", "username", "keyword", "all"
    value: Optional[str] = None  # значение для сравнения
    is_active: bool = True


class ReplyAction(BaseModel):
    action_type: str  # "send_image", "send_text", "send_both"
    image_ids: List[str] = []  # ID картинок для отправки
    text_message: Optional[str] = None
    delay_seconds: int = 0  # задержка перед отправкой


class AutoReplyRule(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    conditions: List[ReplyCondition]
    actions: List[ReplyAction]
    is_active: bool = True
    priority: int = 0  # приоритет выполнения (больше = выше приоритет)
    account_id: Optional[str] = None  # привязка к конкретному аккаунту
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    usage_count: int = 0  # счетчик использований


class AutoReplyRuleCreate(BaseModel):
    name: str
    conditions: List[ReplyCondition]
    actions: List[ReplyAction]
    is_active: bool = True
    priority: int = 0
    account_id: Optional[str] = None


class AutoReplyRuleUpdate(BaseModel):
    name: Optional[str] = None
    conditions: Optional[List[ReplyCondition]] = None
    actions: Optional[List[ReplyAction]] = None
    is_active: Optional[bool] = None
    priority: Optional[int] = None
    updated_at: datetime = Field(default_factory=datetime.utcnow)


# Image Models
class BotImage(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    filename: str
    original_filename: str
    file_path: str
    file_size: int
    mime_type: str
    width: Optional[int] = None
    height: Optional[int] = None
    uploaded_at: datetime = Field(default_factory=datetime.utcnow)
    tags: List[str] = []  # теги для группировки картинок
    is_active: bool = True


class BotImageCreate(BaseModel):
    filename: str
    original_filename: str
    file_path: str
    file_size: int
    mime_type: str
    width: Optional[int] = None
    height: Optional[int] = None
    tags: List[str] = []


# Bot Settings Models
class BotSettings(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    status: BotStatus = BotStatus.STOPPED
    auto_start: bool = False  # автостарт при запуске сервера
    log_messages: bool = True  # логировать входящие сообщения
    response_delay_min: int = 1  # минимальная задержка ответа (сек)
    response_delay_max: int = 5  # максимальная задержка ответа (сек)
    max_daily_responses: int = 1000  # лимит ответов в день
    daily_response_count: int = 0
    last_reset_date: datetime = Field(default_factory=datetime.utcnow)
    allowed_chat_types: List[str] = ["private", "group", "supergroup"]  # типы чатов для ответов
    blacklisted_users: List[str] = []  # ID заблокированных пользователей
    whitelisted_users: List[str] = []  # ID разрешенных пользователей (если не пустой, то только им отвечаем)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class BotSettingsUpdate(BaseModel):
    status: Optional[BotStatus] = None
    auto_start: Optional[bool] = None
    log_messages: Optional[bool] = None
    response_delay_min: Optional[int] = None
    response_delay_max: Optional[int] = None
    max_daily_responses: Optional[int] = None
    allowed_chat_types: Optional[List[str]] = None
    blacklisted_users: Optional[List[str]] = None
    whitelisted_users: Optional[List[str]] = None
    updated_at: datetime = Field(default_factory=datetime.utcnow)


# Bot Activity Log Models
class BotActivityLog(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    account_id: str
    chat_id: int
    chat_type: str
    user_id: int
    username: Optional[str] = None
    first_name: Optional[str] = None
    message_text: Optional[str] = None
    rule_id: Optional[str] = None  # какое правило сработало
    action_taken: str  # описание выполненного действия
    success: bool = True
    error_message: Optional[str] = None


# Phone Verification Models
class PhoneVerification(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    phone: str
    api_id: int
    api_hash: str
    phone_code_hash: Optional[str] = None
    is_verified: bool = False
    created_at: datetime = Field(default_factory=datetime.utcnow)
    expires_at: datetime
    verified_at: Optional[datetime] = None


class PhoneVerificationCode(BaseModel):
    verification_id: str
    code: str


# API Response Models
class APIResponse(BaseModel):
    success: bool
    message: str
    data: Optional[Any] = None


class StatusCheck(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_name: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)


class StatusCheckCreate(BaseModel):
    client_name: str