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


# Auto Reply Rules Models - Enhanced Version
class ChatFilter(BaseModel):
    """Фильтры для выбора чатов"""
    chat_types: List[str] = []  # "private", "group", "supergroup", "channel"
    whitelist_chats: List[str] = []  # ID конкретных чатов (включить)
    blacklist_chats: List[str] = []  # ID конкретных чатов (исключить)
    chat_title_contains: Optional[str] = None  # фильтр по названию
    min_members: Optional[int] = None  # минимум участников
    max_members: Optional[int] = None  # максимум участников


class InlineButton(BaseModel):
    """Инлайн кнопка"""
    text: str  # текст кнопки
    button_type: str  # "url", "callback"
    url: Optional[str] = None  # для URL кнопок
    callback_data: Optional[str] = None  # для callback кнопок
    callback_action: Optional[str] = None  # "send_sticker", "send_emoji", "send_text", "send_image"
    callback_content: Optional[str] = None  # контент для отправки при callback


class MediaContent(BaseModel):
    """Медиа контент"""
    content_type: str  # "image", "sticker", "emoji", "text"
    file_id: Optional[str] = None  # ID файла для стикеров/картинок
    file_path: Optional[str] = None  # путь к загруженному файлу
    text_content: Optional[str] = None  # текстовое содержимое
    caption: Optional[str] = None  # подпись для картинок
    emoji: Optional[str] = None  # эмодзи для реакций


class ReplyCondition(BaseModel):
    """Расширенные условия срабатывания"""
    condition_type: str  # "chat_filter", "user_filter", "message_filter", "time_filter", "all"
    chat_filter: Optional[ChatFilter] = None
    user_ids: List[str] = []  # конкретные пользователи
    usernames: List[str] = []  # пользователи по username
    keywords: List[str] = []  # ключевые слова в сообщении
    message_types: List[str] = []  # "text", "photo", "video", "document", etc.
    time_ranges: List[Dict[str, Any]] = []  # расписание работы
    is_active: bool = True


class ReplyAction(BaseModel):
    """Расширенные действия автоответа"""
    action_type: str  # "send_content", "add_reaction", "combined"
    
    # Основной контент
    media_contents: List[MediaContent] = []  # список медиа для отправки
    
    # Инлайн кнопки
    inline_buttons: List[List[InlineButton]] = []  # ряды кнопок
    
    # Реакции
    reactions: List[str] = []  # эмодзи для реакций
    
    # Настройки
    delay_seconds: int = 0
    delete_after_seconds: Optional[int] = None  # автоудаление через время
    reply_to_message: bool = False  # отвечать на сообщение или просто отправить


class RuleTemplate(BaseModel):
    """Шаблон для правил с переменными"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    template_text: str  # текст с переменными: {user_name}, {chat_title}, {time}, etc.
    variables: Dict[str, str] = {}  # дополнительные переменные
    created_at: datetime = Field(default_factory=datetime.utcnow)


class ConditionalRule(BaseModel):
    """Условное правило (если-то-иначе)"""
    condition: ReplyCondition
    if_action: ReplyAction
    else_action: Optional[ReplyAction] = None


class AutoReplyRule(BaseModel):
    """Расширенное правило автоответа"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: Optional[str] = None
    
    # Условия и действия
    conditions: List[ReplyCondition] = []
    actions: List[ReplyAction] = []
    
    # Условные правила
    conditional_rules: List[ConditionalRule] = []
    
    # Шаблоны
    templates: List[str] = []  # ID шаблонов
    
    # Настройки
    is_active: bool = True
    priority: int = 0
    max_triggers_per_day: Optional[int] = None  # ограничение срабатываний
    cooldown_seconds: int = 0  # кулдаун между срабатываниями
    
    # Привязка
    account_id: Optional[str] = None
    
    # Метаданные
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    usage_count: int = 0
    last_triggered: Optional[datetime] = None
    
    # Статистика
    success_count: int = 0  # успешных срабатываний
    error_count: int = 0  # ошибок при срабатывании


class AutoReplyRuleCreate(BaseModel):
    name: str
    description: Optional[str] = None
    conditions: List[ReplyCondition] = []
    actions: List[ReplyAction] = []
    conditional_rules: List[ConditionalRule] = []
    templates: List[str] = []
    is_active: bool = True
    priority: int = 0
    max_triggers_per_day: Optional[int] = None
    cooldown_seconds: int = 0
    account_id: Optional[str] = None


class AutoReplyRuleUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    conditions: Optional[List[ReplyCondition]] = None
    actions: Optional[List[ReplyAction]] = None
    conditional_rules: Optional[List[ConditionalRule]] = None
    templates: Optional[List[str]] = None
    is_active: Optional[bool] = None
    priority: Optional[int] = None
    max_triggers_per_day: Optional[int] = None
    cooldown_seconds: Optional[int] = None
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
    requires_2fa: bool = False  # Track if 2FA is required
    code_verified: bool = False  # Track if phone code was verified successfully
    created_at: datetime = Field(default_factory=datetime.utcnow)
    expires_at: datetime
    verified_at: Optional[datetime] = None


class PhoneVerificationCode(BaseModel):
    verification_id: str
    code: str


class TwoFactorAuth(BaseModel):
    verification_id: str
    password: str


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