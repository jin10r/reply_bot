export default {
  common: {
    save: 'Save',
    cancel: 'Cancel', 
    delete: 'Delete',
    edit: 'Edit',
    create: 'Create',
    upload: 'Upload',
    search: 'Search',
    filter: 'Filter',
    all: 'All',
    active: 'Active',
    inactive: 'Inactive',
    yes: 'Yes',
    no: 'No',
    close: 'Close',
    loading: 'Loading...',
    error: 'Error',
    success: 'Success',
    warning: 'Warning',
    info: 'Info',
    name: 'Name',
    description: 'Description',
    priority: 'Priority',
    status: 'Status',
    created: 'Created',
    updated: 'Updated',
    actions: 'Actions',
    settings: 'Settings'
  },
  
  navigation: {
    dashboard: 'Dashboard',
    accounts: 'Accounts',
    rules: 'Rules',
    media: 'Media Files',
    logs: 'Logs',
    settings: 'Settings'
  },

  dashboard: {
    title: 'Dashboard',
    subtitle: 'Telegram userbot management and activity monitoring',
    botStatus: 'Bot Status',
    activeAccounts: 'Active Accounts',
    responsesToday: 'Responses Today',
    successRate: 'Success Rate',
    quickActions: 'Quick Actions',
    start: 'Start',
    stop: 'Stop',
    starting: 'Starting...',
    stopping: 'Stopping...',
    online: 'Online',
    offline: 'Offline', 
    running: 'Running',
    stopped: 'Stopped',
    unknown: 'Unknown',
    error: 'Error',
    responseStats: 'Response Statistics',
    dailyLimit: 'Daily Limit',
    totalResponses: 'Total Responses',
    successfulResponses: 'Successful',
    failedResponses: 'Failed',
    used: 'Used',
    limitReached: 'Limit Reached',
    remaining: 'Remaining: {count} responses'
  },

  accounts: {
    title: 'Accounts',
    subtitle: 'Manage Telegram accounts for auto-replies',
    addAccount: 'Add Account',
    phoneNumber: 'Phone Number',
    verificationCode: 'Verification Code',
    twoFactorPassword: '2FA Password',
    apiId: 'API ID',
    apiHash: 'API Hash',
    sessionName: 'Session Name'
  },

  rules: {
    title: 'Auto-Reply Rules',
    subtitle: 'Setup automatic responses to incoming messages',
    enhancedSubtitle: 'Advanced rules with flexible content and conditions',
    allSubtitle: 'Manage all auto-reply rules',
    createRule: 'Create Rule',
    editRule: 'Edit Rule',
    createNewRule: 'Create New Rule',
    basicRules: 'Basic',
    enhancedRules: 'Advanced',
    allRules: 'All',
    noBasicRules: 'No basic rules',
    noEnhancedRules: 'No advanced rules',
    noRules: 'No configured rules',
    createFirstBasic: 'Create your first basic auto-reply rule',
    createFirstEnhanced: 'Create your first advanced rule with flexible conditions',
    createFirst: 'Create your first auto-reply rule to get started',

    // Tabs
    general: 'General',
    conditions: 'Conditions',
    actions: 'Actions',
    advanced: 'Advanced',

    // Form fields
    ruleName: 'Rule Name',
    ruleDescription: 'Description (optional)',
    rulePriority: 'Priority',
    ruleCooldown: 'Cooldown (sec)',
    ruleActive: 'Rule Active',
    maxTriggersPerDay: 'Max triggers per day',
    unlimited: 'Unlimited',

    // Conditions
    conditionsTrigger: 'Trigger Conditions',
    addCondition: 'Add Condition',
    chatFilter: 'Chat Filter',
    userFilter: 'User Filter',
    messageFilter: 'Message Filter',
    timeFilter: 'Time Filter',
    allMessages: 'All Messages',
    chatTypes: 'Chat Types',
    chatTitleFilter: 'Chat Title Filter',
    containsInTitle: 'Contains in title...',
    userIds: 'User IDs (comma separated)',
    usernames: 'Usernames (comma separated, without @)',
    keywords: 'Keywords (comma separated)',
    messageTypes: 'Message Types',

    // Actions
    addAction: 'Add Action',
    actionDelay: 'Delay (sec)',
    actionAutoDelete: 'Auto Delete (sec)',
    noAutoDelete: 'No auto delete',
    replyToMessage: 'Reply to Message',
    contentToSend: 'Content to Send',
    textButton: 'Text',
    imageButton: 'Image',
    stickerButton: 'Sticker',
    emojiButton: 'Emoji',
    messageText: 'Message Text',
    variablesSupported: 'Variables supported: {user_name}, {chat_title}, {time}, {date}',
    selectImage: 'Select Image',
    imageCaption: 'Image Caption (optional)',
    stickerFileId: 'Sticker File ID',
    emoji: 'Emoji',
    inlineButtons: 'Inline Buttons',
    addButton: 'Add Button',
    buttonText: 'Button Text',
    buttonType: 'Button Type',
    urlLink: 'URL Link',
    callbackAction: 'Callback Action',
    callbackData: 'Callback Data',
    actionOnClick: 'Action on Click',
    contentToSendOnClick: 'Content to Send on Click',
    reactions: 'Reactions (emojis separated by space)',

    // Statistics
    totalRules: 'Total Rules',
    activeRules: 'Active',
    inactiveRules: 'Inactive',
    totalTriggers: 'Triggers',
    successfulTriggers: 'Successful Triggers',
    errors: 'Errors',

    // How it works
    howItWorks: 'How Rules Work',
    step1: 'Conditions',
    step1Description: 'Set when the rule should trigger: chat types, users, keywords, time frames',
    step2: 'Actions',
    step2Description: 'Choose what to send: text, images, stickers, inline buttons, reactions or combinations',
    step3: 'Priority',
    step3Description: 'Rules with higher priority execute first. Configure limits and cooldowns.'
  },

  media: {
    title: 'Media Files',
    subtitle: 'Manage images, stickers and other media files for auto-replies',
    uploadFile: 'Upload File',
    uploadMediaFile: 'Upload Media File',
    selectFile: 'Select file and configure upload parameters',
    fileType: 'File Type',
    tags: 'Tags (comma separated)',
    uploading: 'Uploading...',
    uploadProgress: '{percent}%',

    // File types
    image: 'Image',
    sticker: 'Sticker',
    audio: 'Audio',
    video: 'Video',
    document: 'Document',
    allTypes: 'All Types',

    // Statistics
    totalFiles: 'Total Files',
    images: 'Images',
    stickers: 'Stickers',
    totalSize: 'Total Size',

    // Empty states
    noFiles: 'No uploaded files',
    filesNotFound: 'Files not found',
    uploadFirst: 'Upload your first media file to use in rules',
    tryChangingFilters: 'Try changing search filters',

    // File info
    fileInfo: 'File Information',
    type: 'Type:',
    size: 'Size:',
    width: 'Width:',
    height: 'Height:',
    uploaded: 'Uploaded:',
    usageCount: 'Used:',
    times: 'times',
    fileId: 'File ID (for use in rules):',
    fileIdDescription: 'Click to select ID that can be used in auto-reply rules',

    // Supported formats
    supportedFormats: 'Supported Formats and Features',
    formats: {
      images: 'Images',
      imagesDesc: 'JPEG, PNG, GIF, WebP',
      stickers: 'Stickers',
      stickersDesc: 'Animated and static',
      svg: 'SVG',
      svgDesc: 'Vector graphics',
      tagsTitle: 'Tags',
      tagsDesc: 'Organization and search'
    },
    features: 'Features:',
    featuresList: [
      'Upload files up to 5MB',
      'Automatic image dimension detection',
      'Tag system for file organization',
      'File preview functionality',
      'Search by name and tags',
      'Use in auto-reply rules'
    ]
  },

  theme: {
    toggle: 'Theme',
    light: 'Light',
    dark: 'Dark'
  },

  language: {
    select: 'Select Language',
    russian: 'Русский',
    english: 'English'
  },

  messages: {
    confirmDelete: 'Are you sure you want to delete this item?',
    deleteSuccess: 'Item deleted',
    saveSuccess: 'Changes saved',
    uploadSuccess: 'File uploaded successfully!',
    selectFileFirst: 'Select file to upload',
    ruleCreated: 'Rule created!',
    ruleUpdated: 'Rule updated!',
    errorOccurred: 'An error occurred: {error}',
    botStartError: 'Bot start error: {error}',
    botStopError: 'Bot stop error: {error}',
    ruleUpdateError: 'Rule update error: {error}',
    deleteError: 'Delete error: {error}',
    saveError: 'Save error: {error}',
    uploadError: 'File upload error: {error}'
  }
};