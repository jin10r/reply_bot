import React, { useState, useEffect } from "react";
import axios from "axios";
import { 
  Plus, 
  Edit, 
  Trash2, 
  Zap, 
  MessageCircle, 
  Users, 
  Hash,
  Clock,
  Toggle,
  Image,
  Type,
  Smile,
  FileImage,
  Settings,
  ChevronDown,
  ChevronUp,
  Save,
  X,
  Upload,
  Play,
  Filter,
  ToggleLeft,
  ToggleRight
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Switch } from "./ui/switch";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Label } from "./ui/label";
import { Separator } from "./ui/separator";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const UnifiedRules = () => {
  const [rules, setRules] = useState([]);
  const [mediaFiles, setMediaFiles] = useState([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingRule, setEditingRule] = useState(null);
  const [expandedRules, setExpandedRules] = useState(new Set());
  const [viewMode, setViewMode] = useState("enhanced"); // "basic" or "enhanced"
  
  // Form state
  const [ruleForm, setRuleForm] = useState({
    name: "",
    description: "",
    priority: 0,
    is_active: true,
    max_triggers_per_day: null,
    cooldown_seconds: 0,
    conditions: [],
    actions: [],
    conditional_rules: []
  });

  const fetchRules = async () => {
    try {
      const response = await axios.get(`${API}/rules`);
      setRules(response.data);
    } catch (error) {
      console.error("Failed to fetch rules:", error);
    }
  };

  const fetchMediaFiles = async () => {
    try {
      const response = await axios.get(`${API}/media`);
      setMediaFiles(response.data);
    } catch (error) {
      console.error("Failed to fetch media files:", error);
    }
  };

  useEffect(() => {
    fetchRules();
    fetchMediaFiles();
  }, []);

  const toggleRuleExpanded = (ruleId) => {
    const newExpanded = new Set(expandedRules);
    if (newExpanded.has(ruleId)) {
      newExpanded.delete(ruleId);
    } else {
      newExpanded.add(ruleId);
    }
    setExpandedRules(newExpanded);
  };

  const toggleRuleActive = async (ruleId, isActive) => {
    try {
      await axios.put(`${API}/rules/${ruleId}`, {
        is_active: !isActive
      });
      await fetchRules();
    } catch (error) {
      alert("Ошибка обновления правила: " + error.response?.data?.detail || error.message);
    }
  };

  const deleteRule = async (ruleId) => {
    if (!window.confirm("Вы уверены, что хотите удалить это правило?")) {
      return;
    }
    
    try {
      await axios.delete(`${API}/rules/${ruleId}`);
      await fetchRules();
      alert("Правило удалено");
    } catch (error) {
      alert("Ошибка удаления: " + error.response?.data?.detail || error.message);
    }
  };

  const startEditRule = (rule) => {
    setEditingRule(rule);
    setRuleForm({
      name: rule.name,
      description: rule.description || "",
      priority: rule.priority,
      is_active: rule.is_active,
      max_triggers_per_day: rule.max_triggers_per_day,
      cooldown_seconds: rule.cooldown_seconds,
      conditions: rule.conditions || [],
      actions: rule.actions || [],
      conditional_rules: rule.conditional_rules || []
    });
    setShowCreateForm(true);
  };

  const resetForm = () => {
    setRuleForm({
      name: "",
      description: "",
      priority: 0,
      is_active: true,
      max_triggers_per_day: null,
      cooldown_seconds: 0,
      conditions: [],
      actions: [],
      conditional_rules: []
    });
    setEditingRule(null);
    setShowCreateForm(false);
  };

  const saveRule = async () => {
    try {
      if (editingRule) {
        await axios.put(`${API}/rules/${editingRule.id}`, ruleForm);
        alert("Правило обновлено!");
      } else {
        await axios.post(`${API}/rules`, ruleForm);
        alert("Правило создано!");
      }
      await fetchRules();
      resetForm();
    } catch (error) {
      alert("Ошибка сохранения: " + error.response?.data?.detail || error.message);
    }
  };

  const addCondition = (type) => {
    const newCondition = {
      condition_type: type,
      is_active: true,
      user_ids: [],
      usernames: [],
      keywords: [],
      message_types: [],
      time_ranges: []
    };

    if (type === "chat_filter") {
      newCondition.chat_filter = {
        chat_types: [],
        whitelist_chats: [],
        blacklist_chats: [],
        chat_title_contains: null,
        min_members: null,
        max_members: null
      };
    }

    setRuleForm({
      ...ruleForm,
      conditions: [...ruleForm.conditions, newCondition]
    });
  };

  const addAction = () => {
    const newAction = {
      action_type: "send_content",
      media_contents: [],
      inline_buttons: [],
      reactions: [],
      delay_seconds: 0,
      delete_after_seconds: null,
      reply_to_message: false
    };

    setRuleForm({
      ...ruleForm,
      actions: [...ruleForm.actions, newAction]
    });
  };

  const addMediaContent = (actionIndex, type) => {
    const newMediaContent = {
      content_type: type,
      file_id: null,
      file_path: null,
      text_content: null,
      caption: null,
      emoji: null
    };

    const newActions = [...ruleForm.actions];
    newActions[actionIndex].media_contents.push(newMediaContent);
    
    setRuleForm({
      ...ruleForm,
      actions: newActions
    });
  };

  const updateMediaContent = (actionIndex, contentIndex, field, value) => {
    const newActions = [...ruleForm.actions];
    newActions[actionIndex].media_contents[contentIndex][field] = value;
    
    setRuleForm({
      ...ruleForm,
      actions: newActions
    });
  };

  const addInlineButton = (actionIndex) => {
    const newButton = {
      text: "",
      button_type: "url",
      url: null,
      callback_data: null,
      callback_action: null,
      callback_content: null
    };

    const newActions = [...ruleForm.actions];
    if (!newActions[actionIndex].inline_buttons.length) {
      newActions[actionIndex].inline_buttons.push([]);
    }
    newActions[actionIndex].inline_buttons[0].push(newButton);
    
    setRuleForm({
      ...ruleForm,
      actions: newActions
    });
  };

  const getConditionTypeIcon = (type) => {
    switch (type) {
      case "chat_type": return MessageCircle;
      case "user_id": return Users;
      case "username": return Users;
      case "keyword": return Hash;
      case "chat_filter": return Filter;
      case "user_filter": return Users;
      case "message_filter": return Hash;
      case "time_filter": return Clock;
      default: return Zap;
    }
  };

  const getConditionTypeName = (type) => {
    switch (type) {
      case "chat_type": return "Тип чата";
      case "user_id": return "ID пользователя";
      case "username": return "Имя пользователя";
      case "keyword": return "Ключевое слово";
      case "chat_filter": return "Фильтр чатов";
      case "user_filter": return "Фильтр пользователей";
      case "message_filter": return "Фильтр сообщений";
      case "time_filter": return "Временной фильтр";
      case "all": return "Все сообщения";
      default: return type;
    }
  };

  const getActionTypeName = (type) => {
    switch (type) {
      case "send_image": return "Отправить картинку";
      case "send_text": return "Отправить текст";
      case "send_both": return "Текст и картинка";
      case "send_content": return "Отправить контент";
      case "add_reaction": return "Добавить реакцию";
      case "combined": return "Комбинированное действие";
      default: return type;
    }
  };

  // Enhanced rules have more complex structure
  const isEnhancedRule = (rule) => {
    return rule.conditions?.length > 0 && 
           rule.conditions.some(c => ['chat_filter', 'user_filter', 'message_filter', 'time_filter'].includes(c.condition_type)) ||
           rule.actions?.some(a => a.media_contents || a.inline_buttons || a.reactions);
  };

  // Filter rules based on view mode
  const filteredRules = viewMode === "basic" 
    ? rules.filter(rule => !isEnhancedRule(rule))
    : viewMode === "enhanced" 
      ? rules.filter(rule => isEnhancedRule(rule))
      : rules;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Правила автоответов</h1>
          <p className="text-muted-foreground">
            {viewMode === "basic" 
              ? "Базовые автоответы на входящие сообщения"
              : viewMode === "enhanced"
                ? "Расширенные правила с гибким контентом и условиями"
                : "Управление всеми правилами автоответов"
            }
          </p>
        </div>
        
        <div className="flex items-center space-x-4">
          {/* View Mode Switcher */}
          <div className="flex items-center space-x-2">
            <Button
              variant={viewMode === "basic" ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode("basic")}
            >
              Базовые
            </Button>
            <Button
              variant={viewMode === "enhanced" ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode("enhanced")}
            >
              Расширенные
            </Button>
            <Button
              variant={viewMode === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode("all")}
            >
              Все
            </Button>
          </div>
          
          <Button onClick={() => setShowCreateForm(true)} size="lg">
            <Plus className="w-4 h-4 mr-2" />
            Создать правило
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Всего правил</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{filteredRules.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Активных</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">
              {filteredRules.filter(rule => rule.is_active).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Отключенных</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-muted-foreground">
              {filteredRules.filter(rule => !rule.is_active).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Срабатываний</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              {filteredRules.reduce((sum, rule) => sum + (rule.usage_count || 0), 0)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Rules List */}
      <div className="space-y-4">
        {filteredRules.map((rule) => (
          <Card key={rule.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className={`w-3 h-3 rounded-full ${rule.is_active ? 'bg-success' : 'bg-muted-foreground'}`} />
                  <div>
                    <div className="flex items-center space-x-2">
                      <CardTitle className="text-lg">{rule.name}</CardTitle>
                      {isEnhancedRule(rule) && (
                        <Badge variant="default" className="text-xs">Расширенное</Badge>
                      )}
                    </div>
                    <CardDescription>
                      {rule.description && (
                        <span>{rule.description} • </span>
                      )}
                      Приоритет: {rule.priority} • Использований: {rule.usage_count || 0}
                      {rule.max_triggers_per_day && (
                        <span> • Лимит: {rule.max_triggers_per_day}/день</span>
                      )}
                    </CardDescription>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  {isEnhancedRule(rule) && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => toggleRuleExpanded(rule.id)}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      {expandedRules.has(rule.id) ? 
                        <ChevronUp className="w-4 h-4" /> : 
                        <ChevronDown className="w-4 h-4" />
                      }
                    </Button>
                  )}
                  <Switch
                    checked={rule.is_active}
                    onCheckedChange={() => toggleRuleActive(rule.id, rule.is_active)}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => startEditRule(rule)}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => deleteRule(rule.id)}
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="space-y-4">
              {/* Conditions */}
              <div>
                <h4 className="font-medium text-sm mb-2 flex items-center">
                  <Zap className="w-4 h-4 mr-2 text-primary" />
                  Условия срабатывания
                </h4>
                <div className="flex flex-wrap gap-2">
                  {rule.conditions?.map((condition, index) => {
                    const IconComponent = getConditionTypeIcon(condition.condition_type);
                    return (
                      <Badge key={index} variant="secondary" className="flex items-center space-x-1">
                        <IconComponent className="w-3 h-3" />
                        <span>
                          {getConditionTypeName(condition.condition_type)}
                          {condition.value && `: ${condition.value}`}
                        </span>
                      </Badge>
                    );
                  })}
                </div>
              </div>

              {/* Actions */}
              <div>
                <h4 className="font-medium text-sm mb-2 flex items-center">
                  <MessageCircle className="w-4 h-4 mr-2 text-success" />
                  Действия
                </h4>
                <div className="flex flex-wrap gap-2">
                  {rule.actions?.map((action, index) => (
                    <Badge key={index} variant="success" className="flex items-center space-x-1">
                      {action.delay_seconds > 0 && (
                        <Clock className="w-3 h-3" />
                      )}
                      <span>
                        {getActionTypeName(action.action_type)}
                        {action.delay_seconds > 0 && ` (${action.delay_seconds}с)`}
                      </span>
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Enhanced Rule Details */}
              {isEnhancedRule(rule) && expandedRules.has(rule.id) && (
                <div className="border-t pt-4 space-y-4">
                  {/* Enhanced Actions */}
                  {rule.actions?.some(action => action.media_contents || action.inline_buttons || action.reactions) && (
                    <div>
                      <h4 className="font-medium text-sm mb-2">Расширенные действия</h4>
                      <div className="space-y-2">
                        {rule.actions.map((action, index) => (
                          <div key={index} className="border rounded p-3 space-y-2">
                            <Badge variant="success">{getActionTypeName(action.action_type)}</Badge>
                            
                            {action.media_contents && action.media_contents.length > 0 && (
                              <div className="flex flex-wrap gap-2">
                                {action.media_contents.map((content, contentIndex) => (
                                  <Badge key={contentIndex} variant="outline">
                                    {content.content_type}
                                    {content.caption && `: ${content.caption.substring(0, 20)}...`}
                                  </Badge>
                                ))}
                              </div>
                            )}

                            {action.inline_buttons && action.inline_buttons.length > 0 && (
                              <div className="text-sm text-muted-foreground">
                                Инлайн кнопок: {action.inline_buttons.reduce((sum, row) => sum + row.length, 0)}
                              </div>
                            )}

                            {action.reactions && action.reactions.length > 0 && (
                              <div className="flex gap-1">
                                {action.reactions.map((reaction, reactionIndex) => (
                                  <span key={reactionIndex} className="text-lg">{reaction}</span>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Additional Info */}
              <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
                <div>
                  Создано: {new Date(rule.created_at).toLocaleString("ru-RU")}
                </div>
                <div>
                  Обновлено: {new Date(rule.updated_at).toLocaleString("ru-RU")}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Empty State */}
      {filteredRules.length === 0 && (
        <Card className="text-center py-12">
          <CardContent>
            <Zap className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <CardTitle className="mb-2">
              {viewMode === "basic" 
                ? "Нет базовых правил"
                : viewMode === "enhanced"
                  ? "Нет расширенных правил" 
                  : "Нет настроенных правил"
              }
            </CardTitle>
            <CardDescription className="mb-4">
              {viewMode === "basic"
                ? "Создайте первое базовое правило автоответа"
                : viewMode === "enhanced"
                  ? "Создайте первое расширенное правило с гибкими условиями"
                  : "Создайте первое правило автоответа для начала работы"
              }
            </CardDescription>
            <Button onClick={() => setShowCreateForm(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Создать правило
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Create/Edit Rule Dialog */}
      <Dialog open={showCreateForm} onOpenChange={resetForm}>
        <DialogContent className="sm:max-w-[800px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingRule ? "Редактировать правило" : "Создать новое правило"}
            </DialogTitle>
            <DialogDescription>
              Настройте условия и действия для автоответа. Используйте расширенные функции для создания сложных правил с медиа-контентом и инлайн кнопками.
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="general" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="general">Основное</TabsTrigger>
              <TabsTrigger value="conditions">Условия</TabsTrigger>
              <TabsTrigger value="actions">Действия</TabsTrigger>
              <TabsTrigger value="advanced">Дополнительно</TabsTrigger>
            </TabsList>

            {/* General Tab */}
            <TabsContent value="general" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="rule-name">Название правила</Label>
                <Input
                  id="rule-name"
                  value={ruleForm.name}
                  onChange={(e) => setRuleForm({...ruleForm, name: e.target.value})}
                  placeholder="Введите название правила"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="rule-description">Описание (опционально)</Label>
                <Textarea
                  id="rule-description"
                  value={ruleForm.description}
                  onChange={(e) => setRuleForm({...ruleForm, description: e.target.value})}
                  placeholder="Краткое описание правила"
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="rule-priority">Приоритет</Label>
                  <Input
                    id="rule-priority"
                    type="number"
                    value={ruleForm.priority}
                    onChange={(e) => setRuleForm({...ruleForm, priority: parseInt(e.target.value) || 0})}
                    placeholder="0"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="rule-cooldown">Кулдаун (сек)</Label>
                  <Input
                    id="rule-cooldown"
                    type="number"
                    value={ruleForm.cooldown_seconds}
                    onChange={(e) => setRuleForm({...ruleForm, cooldown_seconds: parseInt(e.target.value) || 0})}
                    placeholder="0"
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="rule-active"
                  checked={ruleForm.is_active}
                  onCheckedChange={(checked) => setRuleForm({...ruleForm, is_active: checked})}
                />
                <Label htmlFor="rule-active">Правило активно</Label>
              </div>
            </TabsContent>

            {/* Conditions Tab */}
            <TabsContent value="conditions" className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">Условия срабатывания</h3>
                <Select onValueChange={addCondition}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Добавить условие" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="chat_filter">Фильтр чатов</SelectItem>
                    <SelectItem value="user_filter">Фильтр пользователей</SelectItem>
                    <SelectItem value="message_filter">Фильтр сообщений</SelectItem>
                    <SelectItem value="time_filter">Временной фильтр</SelectItem>
                    <SelectItem value="all">Все сообщения</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {ruleForm.conditions.map((condition, index) => (
                <Card key={index}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-4">
                      <Badge variant="secondary">
                        {getConditionTypeName(condition.condition_type)}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          const newConditions = ruleForm.conditions.filter((_, i) => i !== index);
                          setRuleForm({...ruleForm, conditions: newConditions});
                        }}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>

                    {/* Chat Filter UI */}
                    {condition.condition_type === "chat_filter" && condition.chat_filter && (
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label>Типы чатов</Label>
                          <div className="flex flex-wrap gap-2">
                            {["private", "group", "supergroup", "channel"].map((type) => (
                              <Badge
                                key={type}
                                variant={condition.chat_filter.chat_types?.includes(type) ? "default" : "outline"}
                                className="cursor-pointer"
                                onClick={() => {
                                  const chatTypes = condition.chat_filter.chat_types || [];
                                  const newChatTypes = chatTypes.includes(type)
                                    ? chatTypes.filter(t => t !== type)
                                    : [...chatTypes, type];
                                  
                                  const newConditions = [...ruleForm.conditions];
                                  newConditions[index].chat_filter.chat_types = newChatTypes;
                                  setRuleForm({...ruleForm, conditions: newConditions});
                                }}
                              >
                                {type}
                              </Badge>
                            ))}
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label>Фильтр по названию чата</Label>
                          <Input
                            value={condition.chat_filter.chat_title_contains || ""}
                            onChange={(e) => {
                              const newConditions = [...ruleForm.conditions];
                              newConditions[index].chat_filter.chat_title_contains = e.target.value || null;
                              setRuleForm({...ruleForm, conditions: newConditions});
                            }}
                            placeholder="Содержит в названии..."
                          />
                        </div>
                      </div>
                    )}

                    {/* User Filter UI */}
                    {condition.condition_type === "user_filter" && (
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label>ID пользователей (через запятую)</Label>
                          <Input
                            value={condition.user_ids?.join(", ") || ""}
                            onChange={(e) => {
                              const newConditions = [...ruleForm.conditions];
                              newConditions[index].user_ids = e.target.value
                                ? e.target.value.split(",").map(id => id.trim())
                                : [];
                              setRuleForm({...ruleForm, conditions: newConditions});
                            }}
                            placeholder="123456789, 987654321"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label>Usernames (через запятую, без @)</Label>
                          <Input
                            value={condition.usernames?.join(", ") || ""}
                            onChange={(e) => {
                              const newConditions = [...ruleForm.conditions];
                              newConditions[index].usernames = e.target.value
                                ? e.target.value.split(",").map(username => username.trim())
                                : [];
                              setRuleForm({...ruleForm, conditions: newConditions});
                            }}
                            placeholder="username1, username2"
                          />
                        </div>
                      </div>
                    )}

                    {/* Message Filter UI */}
                    {condition.condition_type === "message_filter" && (
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label>Ключевые слова (через запятую)</Label>
                          <Input
                            value={condition.keywords?.join(", ") || ""}
                            onChange={(e) => {
                              const newConditions = [...ruleForm.conditions];
                              newConditions[index].keywords = e.target.value
                                ? e.target.value.split(",").map(keyword => keyword.trim())
                                : [];
                              setRuleForm({...ruleForm, conditions: newConditions});
                            }}
                            placeholder="привет, помощь, инфо"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label>Типы сообщений</Label>
                          <div className="flex flex-wrap gap-2">
                            {["text", "photo", "video", "document", "audio", "sticker"].map((type) => (
                              <Badge
                                key={type}
                                variant={condition.message_types?.includes(type) ? "default" : "outline"}
                                className="cursor-pointer"
                                onClick={() => {
                                  const messageTypes = condition.message_types || [];
                                  const newMessageTypes = messageTypes.includes(type)
                                    ? messageTypes.filter(t => t !== type)
                                    : [...messageTypes, type];
                                  
                                  const newConditions = [...ruleForm.conditions];
                                  newConditions[index].message_types = newMessageTypes;
                                  setRuleForm({...ruleForm, conditions: newConditions});
                                }}
                              >
                                {type}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}

              {ruleForm.conditions.length === 0 && (
                <div className="text-center text-muted-foreground py-8">
                  Добавьте условия для срабатывания правила
                </div>
              )}
            </TabsContent>

            {/* Actions Tab */}
            <TabsContent value="actions" className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">Действия</h3>
                <Button onClick={addAction} variant="outline" size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  Добавить действие
                </Button>
              </div>

              {ruleForm.actions.map((action, actionIndex) => (
                <Card key={actionIndex}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-4">
                      <Badge variant="success">Действие {actionIndex + 1}</Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          const newActions = ruleForm.actions.filter((_, i) => i !== actionIndex);
                          setRuleForm({...ruleForm, actions: newActions});
                        }}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>

                    {/* Action Settings */}
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div className="space-y-2">
                        <Label>Задержка (сек)</Label>
                        <Input
                          type="number"
                          value={action.delay_seconds}
                          onChange={(e) => {
                            const newActions = [...ruleForm.actions];
                            newActions[actionIndex].delay_seconds = parseInt(e.target.value) || 0;
                            setRuleForm({...ruleForm, actions: newActions});
                          }}
                          placeholder="0"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Автоудаление (сек)</Label>
                        <Input
                          type="number"
                          value={action.delete_after_seconds || ""}
                          onChange={(e) => {
                            const newActions = [...ruleForm.actions];
                            newActions[actionIndex].delete_after_seconds = parseInt(e.target.value) || null;
                            setRuleForm({...ruleForm, actions: newActions});
                          }}
                          placeholder="Не удалять"
                        />
                      </div>
                    </div>

                    {/* Reply to message toggle */}
                    <div className="flex items-center space-x-2 mb-4">
                      <Switch
                        id={`reply-toggle-${actionIndex}`}
                        checked={action.reply_to_message}
                        onCheckedChange={(checked) => {
                          const newActions = [...ruleForm.actions];
                          newActions[actionIndex].reply_to_message = checked;
                          setRuleForm({...ruleForm, actions: newActions});
                        }}
                      />
                      <Label htmlFor={`reply-toggle-${actionIndex}`}>Отвечать на сообщение</Label>
                    </div>

                    <Separator className="my-4" />

                    {/* Media Contents */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium">Контент для отправки</h4>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => addMediaContent(actionIndex, "text")}
                          >
                            <Type className="w-4 h-4 mr-1" />
                            Текст
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => addMediaContent(actionIndex, "image")}
                          >
                            <Image className="w-4 h-4 mr-1" />
                            Картинка
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => addMediaContent(actionIndex, "sticker")}
                          >
                            <FileImage className="w-4 h-4 mr-1" />
                            Стикер
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => addMediaContent(actionIndex, "emoji")}
                          >
                            <Smile className="w-4 h-4 mr-1" />
                            Эмодзи
                          </Button>
                        </div>
                      </div>

                      {action.media_contents.map((content, contentIndex) => (
                        <Card key={contentIndex} className="bg-muted/30">
                          <CardContent className="p-3">
                            <div className="flex items-center justify-between mb-2">
                              <Badge variant="outline">{content.content_type}</Badge>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  const newActions = [...ruleForm.actions];
                                  newActions[actionIndex].media_contents = 
                                    newActions[actionIndex].media_contents.filter((_, i) => i !== contentIndex);
                                  setRuleForm({...ruleForm, actions: newActions});
                                }}
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            </div>

                            {content.content_type === "text" && (
                              <div className="space-y-2">
                                <Label>Текст сообщения</Label>
                                <Textarea
                                  value={content.text_content || ""}
                                  onChange={(e) => updateMediaContent(actionIndex, contentIndex, "text_content", e.target.value)}
                                  placeholder="Введите текст сообщения..."
                                  rows={3}
                                />
                                <div className="text-xs text-muted-foreground">
                                  Поддерживаются переменные: {"{user_name}"}, {"{chat_title}"}, {"{time}"}, {"{date}"}
                                </div>
                              </div>
                            )}

                            {content.content_type === "image" && (
                              <div className="space-y-2">
                                <Label>Выберите изображение</Label>
                                <Select 
                                  value={content.file_id || ""} 
                                  onValueChange={(value) => updateMediaContent(actionIndex, contentIndex, "file_id", value)}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Выберите изображение" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {mediaFiles.filter(f => f.file_type === "image").map((file) => (
                                      <SelectItem key={file.id} value={file.id}>
                                        {file.original_filename}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>

                                <div className="space-y-2">
                                  <Label>Подпись к изображению (опционально)</Label>
                                  <Textarea
                                    value={content.caption || ""}
                                    onChange={(e) => updateMediaContent(actionIndex, contentIndex, "caption", e.target.value)}
                                    placeholder="Подпись к изображению..."
                                    rows={2}
                                  />
                                </div>
                              </div>
                            )}

                            {content.content_type === "sticker" && (
                              <div className="space-y-2">
                                <Label>File ID стикера</Label>
                                <Input
                                  value={content.file_id || ""}
                                  onChange={(e) => updateMediaContent(actionIndex, contentIndex, "file_id", e.target.value)}
                                  placeholder="CAACAgIAAxkBAAI..."
                                />
                              </div>
                            )}

                            {content.content_type === "emoji" && (
                              <div className="space-y-2">
                                <Label>Эмодзи</Label>
                                <Input
                                  value={content.emoji || ""}
                                  onChange={(e) => updateMediaContent(actionIndex, contentIndex, "emoji", e.target.value)}
                                  placeholder="😀"
                                />
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                    </div>

                    <Separator className="my-4" />

                    {/* Inline Buttons */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium">Инлайн кнопки</h4>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => addInlineButton(actionIndex)}
                        >
                          <Plus className="w-4 h-4 mr-1" />
                          Добавить кнопку
                        </Button>
                      </div>

                      {action.inline_buttons && action.inline_buttons.map((buttonRow, rowIndex) => (
                        <div key={rowIndex} className="space-y-2">
                          {buttonRow.map((button, buttonIndex) => (
                            <Card key={buttonIndex} className="bg-muted/30">
                              <CardContent className="p-3">
                                <div className="flex items-center justify-between mb-2">
                                  <Badge variant="outline">Кнопка {buttonIndex + 1}</Badge>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      const newActions = [...ruleForm.actions];
                                      newActions[actionIndex].inline_buttons[rowIndex] = 
                                        newActions[actionIndex].inline_buttons[rowIndex].filter((_, i) => i !== buttonIndex);
                                      setRuleForm({...ruleForm, actions: newActions});
                                    }}
                                  >
                                    <X className="w-4 h-4" />
                                  </Button>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                  <div className="space-y-2">
                                    <Label>Текст кнопки</Label>
                                    <Input
                                      value={button.text}
                                      onChange={(e) => {
                                        const newActions = [...ruleForm.actions];
                                        newActions[actionIndex].inline_buttons[rowIndex][buttonIndex].text = e.target.value;
                                        setRuleForm({...ruleForm, actions: newActions});
                                      }}
                                      placeholder="Нажми меня"
                                    />
                                  </div>

                                  <div className="space-y-2">
                                    <Label>Тип кнопки</Label>
                                    <Select
                                      value={button.button_type}
                                      onValueChange={(value) => {
                                        const newActions = [...ruleForm.actions];
                                        newActions[actionIndex].inline_buttons[rowIndex][buttonIndex].button_type = value;
                                        setRuleForm({...ruleForm, actions: newActions});
                                      }}
                                    >
                                      <SelectTrigger>
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="url">URL ссылка</SelectItem>
                                        <SelectItem value="callback">Callback действие</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>
                                </div>

                                {button.button_type === "url" && (
                                  <div className="space-y-2 mt-4">
                                    <Label>URL ссылка</Label>
                                    <Input
                                      value={button.url || ""}
                                      onChange={(e) => {
                                        const newActions = [...ruleForm.actions];
                                        newActions[actionIndex].inline_buttons[rowIndex][buttonIndex].url = e.target.value;
                                        setRuleForm({...ruleForm, actions: newActions});
                                      }}
                                      placeholder="https://example.com"
                                    />
                                  </div>
                                )}

                                {button.button_type === "callback" && (
                                  <div className="space-y-4 mt-4">
                                    <div className="grid grid-cols-2 gap-4">
                                      <div className="space-y-2">
                                        <Label>Callback данные</Label>
                                        <Input
                                          value={button.callback_data || ""}
                                          onChange={(e) => {
                                            const newActions = [...ruleForm.actions];
                                            newActions[actionIndex].inline_buttons[rowIndex][buttonIndex].callback_data = e.target.value;
                                            setRuleForm({...ruleForm, actions: newActions});
                                          }}
                                          placeholder="action_1"
                                        />
                                      </div>

                                      <div className="space-y-2">
                                        <Label>Действие при нажатии</Label>
                                        <Select
                                          value={button.callback_action || ""}
                                          onValueChange={(value) => {
                                            const newActions = [...ruleForm.actions];
                                            newActions[actionIndex].inline_buttons[rowIndex][buttonIndex].callback_action = value;
                                            setRuleForm({...ruleForm, actions: newActions});
                                          }}
                                        >
                                          <SelectTrigger>
                                            <SelectValue placeholder="Выберите действие" />
                                          </SelectTrigger>
                                          <SelectContent>
                                            <SelectItem value="send_sticker">Отправить стикер</SelectItem>
                                            <SelectItem value="send_emoji">Отправить эмодзи</SelectItem>
                                            <SelectItem value="send_text">Отправить текст</SelectItem>
                                            <SelectItem value="send_image">Отправить картинку</SelectItem>
                                          </SelectContent>
                                        </Select>
                                      </div>
                                    </div>

                                    <div className="space-y-2">
                                      <Label>Контент для отправки</Label>
                                      <Input
                                        value={button.callback_content || ""}
                                        onChange={(e) => {
                                          const newActions = [...ruleForm.actions];
                                          newActions[actionIndex].inline_buttons[rowIndex][buttonIndex].callback_content = e.target.value;
                                          setRuleForm({...ruleForm, actions: newActions});
                                        }}
                                        placeholder={
                                          button.callback_action === "send_sticker" ? "File ID стикера" :
                                          button.callback_action === "send_emoji" ? "😀" :
                                          button.callback_action === "send_text" ? "Текст сообщения" :
                                          "ID или путь к файлу"
                                        }
                                      />
                                    </div>
                                  </div>
                                )}
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      ))}
                    </div>

                    <Separator className="my-4" />

                    {/* Reactions */}
                    <div className="space-y-2">
                      <Label>Реакции (эмодзи через пробел)</Label>
                      <Input
                        value={action.reactions?.join(" ") || ""}
                        onChange={(e) => {
                          const newActions = [...ruleForm.actions];
                          newActions[actionIndex].reactions = e.target.value
                            ? e.target.value.split(" ").filter(emoji => emoji.trim())
                            : [];
                          setRuleForm({...ruleForm, actions: newActions});
                        }}
                        placeholder="👍 ❤️ 😊"
                      />
                    </div>
                  </CardContent>
                </Card>
              ))}

              {ruleForm.actions.length === 0 && (
                <div className="text-center text-muted-foreground py-8">
                  Добавьте действия для выполнения при срабатывании правила
                </div>
              )}
            </TabsContent>

            {/* Advanced Tab */}
            <TabsContent value="advanced" className="space-y-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="max-triggers">Максимум срабатываний в день</Label>
                  <Input
                    id="max-triggers"
                    type="number"
                    value={ruleForm.max_triggers_per_day || ""}
                    onChange={(e) => setRuleForm({
                      ...ruleForm, 
                      max_triggers_per_day: parseInt(e.target.value) || null
                    })}
                    placeholder="Без ограничений"
                  />
                </div>

                <Separator />

                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Статистика и мониторинг</h3>
                  
                  {editingRule && (
                    <div className="grid grid-cols-2 gap-4">
                      <Card>
                        <CardContent className="p-4">
                          <div className="text-2xl font-bold text-primary">
                            {editingRule.success_count || 0}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            Успешных срабатываний
                          </div>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardContent className="p-4">
                          <div className="text-2xl font-bold text-destructive">
                            {editingRule.error_count || 0}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            Ошибок
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter className="flex gap-2">
            <Button variant="outline" onClick={resetForm}>
              Отмена
            </Button>
            <Button onClick={saveRule} disabled={!ruleForm.name.trim()}>
              <Save className="w-4 h-4 mr-2" />
              {editingRule ? "Сохранить изменения" : "Создать правило"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Help Card */}
      <Card>
        <CardHeader>
          <CardTitle>Как работают правила</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <div className="w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-medium">
                1
              </div>
              <h4 className="font-medium">Условия</h4>
              <p className="text-sm text-muted-foreground">
                Настройте когда должно сработать правило: типы чатов, пользователи, ключевые слова, временные рамки
              </p>
            </div>
            <div className="space-y-2">
              <div className="w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-medium">
                2
              </div>
              <h4 className="font-medium">Действия</h4>
              <p className="text-sm text-muted-foreground">
                Выберите что отправить: текст, изображения, стикеры, инлайн кнопки, реакции или их комбинации
              </p>
            </div>
            <div className="space-y-2">
              <div className="w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-medium">
                3
              </div>
              <h4 className="font-medium">Приоритет</h4>
              <p className="text-sm text-muted-foreground">
                Правила с высшим приоритетом выполняются первыми. Настройте лимиты и кулдауны.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default UnifiedRules;