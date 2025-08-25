export default {
  common: {
    save: 'Сохранить',
    cancel: 'Отмена',
    delete: 'Удалить',
    edit: 'Редактировать',
    create: 'Создать',
    upload: 'Загрузить',
    search: 'Поиск',
    filter: 'Фильтр',
    all: 'Все',
    active: 'Активные',
    inactive: 'Неактивные',
    yes: 'Да',
    no: 'Нет',
    close: 'Закрыть',
    loading: 'Загрузка...',
    error: 'Ошибка',
    success: 'Успешно',
    warning: 'Предупреждение',
    info: 'Информация',
    name: 'Название',
    description: 'Описание',
    priority: 'Приоритет',
    status: 'Статус',
    created: 'Создано',
    updated: 'Обновлено',
    actions: 'Действия',
    settings: 'Настройки'
  },
  
  navigation: {
    dashboard: 'Dashboard',
    accounts: 'Аккаунты',
    rules: 'Правила',
    media: 'Медиафайлы',
    logs: 'Логи',
    settings: 'Настройки'
  },

  dashboard: {
    title: 'Dashboard',
    subtitle: 'Управление Telegram userbot и мониторинг активности',
    botStatus: 'Статус бота',
    activeAccounts: 'Активные аккаунты',
    responsesToday: 'Ответов сегодня',
    successRate: 'Успешность',
    quickActions: 'Быстрые действия',
    start: 'Запустить',
    stop: 'Остановить',
    starting: 'Запуск...',
    stopping: 'Остановка...',
    online: 'Online',
    offline: 'Offline',
    running: 'Активен',
    stopped: 'Остановлен',
    unknown: 'Неизвестно',
    error: 'Ошибка',
    responseStats: 'Статистика ответов',
    dailyLimit: 'Дневной лимит',
    totalResponses: 'Всего ответов',
    successfulResponses: 'Успешных',
    failedResponses: 'Ошибок',
    used: 'Использовано',
    limitReached: 'Лимит достигнут',
    remaining: 'Осталось: {count} ответов'
  },

  accounts: {
    title: 'Аккаунты',
    subtitle: 'Управление Telegram аккаунтами для автоответов',
    addAccount: 'Добавить аккаунт',
    phoneNumber: 'Номер телефона',
    verificationCode: 'Код подтверждения',
    twoFactorPassword: '2FA пароль',
    apiId: 'API ID',
    apiHash: 'API Hash',
    sessionName: 'Имя сессии'
  },

  rules: {
    title: 'Правила автоответов',
    subtitle: 'Настройка автоматических ответов на входящие сообщения',
    enhancedSubtitle: 'Расширенные правила с гибким контентом и условиями',
    allSubtitle: 'Управление всеми правилами автоответов',
    createRule: 'Создать правило',
    editRule: 'Редактировать правило',
    createNewRule: 'Создать новое правило',
    basicRules: 'Базовые',
    enhancedRules: 'Расширенные',
    allRules: 'Все',
    noBasicRules: 'Нет базовых правил',
    noEnhancedRules: 'Нет расширенных правил',
    noRules: 'Нет настроенных правил',
    createFirstBasic: 'Создайте первое базовое правило автоответа',
    createFirstEnhanced: 'Создайте первое расширенное правило с гибкими условиями',
    createFirst: 'Создайте первое правило автоответа для начала работы',
    
    // Tabs
    general: 'Основное',
    conditions: 'Условия',
    actions: 'Действия',
    advanced: 'Дополнительно',

    // Form fields
    ruleName: 'Название правила',
    ruleDescription: 'Описание (опционально)',
    rulePriority: 'Приоритет',
    ruleCooldown: 'Кулдаун (сек)',
    ruleActive: 'Правило активно',
    maxTriggersPerDay: 'Максимум срабатываний в день',
    unlimited: 'Без ограничений',

    // Conditions
    conditionsTrigger: 'Условия срабатывания',
    addCondition: 'Добавить условие',
    chatFilter: 'Фильтр чатов',
    userFilter: 'Фильтр пользователей',
    messageFilter: 'Фильтр сообщений',
    timeFilter: 'Временной фильтр',
    allMessages: 'Все сообщения',
    chatTypes: 'Типы чатов',
    chatTitleFilter: 'Фильтр по названию чата',
    containsInTitle: 'Содержит в названии...',
    userIds: 'ID пользователей (через запятую)',
    usernames: 'Usernames (через запятую, без @)',
    keywords: 'Ключевые слова (через запятую)',
    messageTypes: 'Типы сообщений',

    // Actions
    addAction: 'Добавить действие',
    actionDelay: 'Задержка (сек)',
    actionAutoDelete: 'Автоудаление (сек)',
    noAutoDelete: 'Не удалять',
    replyToMessage: 'Отвечать на сообщение',
    contentToSend: 'Контент для отправки',
    textButton: 'Текст',
    imageButton: 'Картинка',
    stickerButton: 'Стикер',
    emojiButton: 'Эмодзи',
    messageText: 'Текст сообщения',
    variablesSupported: 'Поддерживаются переменные: {user_name}, {chat_title}, {time}, {date}',
    selectImage: 'Выберите изображение',
    imageCaption: 'Подпись к изображению (опционально)',
    stickerFileId: 'File ID стикера',
    emoji: 'Эмодзи',
    inlineButtons: 'Инлайн кнопки',
    addButton: 'Добавить кнопку',
    buttonText: 'Текст кнопки',
    buttonType: 'Тип кнопки',
    urlLink: 'URL ссылка',
    callbackAction: 'Callback действие',
    callbackData: 'Callback данные',
    actionOnClick: 'Действие при нажатии',
    contentToSendOnClick: 'Контент для отправки',
    reactions: 'Реакции (эмодзи через пробел)',

    // Statistics
    totalRules: 'Всего правил',
    activeRules: 'Активных',
    inactiveRules: 'Отключенных',
    totalTriggers: 'Срабатываний',
    successfulTriggers: 'Успешных срабатываний',
    errors: 'Ошибок',

    // How it works
    howItWorks: 'Как работают правила',
    step1: 'Условия',
    step1Description: 'Настройте когда должно сработать правило: типы чатов, пользователи, ключевые слова, временные рамки',
    step2: 'Действия', 
    step2Description: 'Выберите что отправить: текст, изображения, стикеры, инлайн кнопки, реакции или их комбинации',
    step3: 'Приоритет',
    step3Description: 'Правила с высшим приоритетом выполняются первыми. Настройте лимиты и кулдауны.'
  },

  media: {
    title: 'Медиафайлы',
    subtitle: 'Управление изображениями, стикерами и другими медиафайлами для автоответов',
    uploadFile: 'Загрузить файл',
    uploadMediaFile: 'Загрузить медиафайл',
    selectFile: 'Выберите файл и настройте параметры загрузки',
    fileType: 'Тип файла',
    tags: 'Теги (через запятую)',
    uploading: 'Загружается...',
    uploadProgress: '{percent}%',
    
    // File types
    image: 'Изображение',
    sticker: 'Стикер',
    audio: 'Аудио',
    video: 'Видео',
    document: 'Документ',
    allTypes: 'Все типы',

    // Statistics
    totalFiles: 'Всего файлов',
    images: 'Изображений',
    stickers: 'Стикеров',
    totalSize: 'Общий размер',

    // Empty states
    noFiles: 'Нет загруженных файлов',
    filesNotFound: 'Файлы не найдены',
    uploadFirst: 'Загрузите первый медиафайл для использования в правилах',
    tryChangingFilters: 'Попробуйте изменить фильтры поиска',

    // File info
    fileInfo: 'Информация о файле',
    type: 'Тип:',
    size: 'Размер:',
    width: 'Ширина:',
    height: 'Высота:',
    uploaded: 'Загружен:',
    usageCount: 'Использован:',
    times: 'раз',
    fileId: 'File ID (для использования в правилах):',
    fileIdDescription: 'Кликните для выделения ID, который можно использовать в правилах автоответов',

    // Supported formats
    supportedFormats: 'Поддерживаемые форматы и возможности',
    formats: {
      images: 'Изображения',
      imagesDesc: 'JPEG, PNG, GIF, WebP',
      stickers: 'Стикеры',
      stickersDesc: 'Анимированные и статичные',
      svg: 'SVG',
      svgDesc: 'Векторная графика',
      tagsTitle: 'Теги',
      tagsDesc: 'Организация и поиск'
    },
    features: 'Возможности:',
    featuresList: [
      'Загрузка файлов до 5MB',
      'Автоматическое определение размеров изображений', 
      'Система тегов для организации файлов',
      'Предварительный просмотр файлов',
      'Поиск по названию и тегам',
      'Использование в правилах автоответов'
    ]
  },

  theme: {
    toggle: 'Тема оформления',
    light: 'Светлая',
    dark: 'Темная'
  },

  language: {
    select: 'Выберите язык',
    russian: 'Русский',
    english: 'English'
  },

  messages: {
    confirmDelete: 'Вы уверены, что хотите удалить этот элемент?',
    deleteSuccess: 'Элемент удален',
    saveSuccess: 'Изменения сохранены',
    uploadSuccess: 'Файл успешно загружен!',
    selectFileFirst: 'Выберите файл для загрузки',
    ruleCreated: 'Правило создано!',
    ruleUpdated: 'Правило обновлено!',
    errorOccurred: 'Произошла ошибка: {error}',
    botStartError: 'Ошибка запуска бота: {error}',
    botStopError: 'Ошибка остановки бота: {error}',
    ruleUpdateError: 'Ошибка обновления правила: {error}',
    deleteError: 'Ошибка удаления: {error}',
    saveError: 'Ошибка сохранения: {error}',
    uploadError: 'Ошибка загрузки файла: {error}'
  }
};