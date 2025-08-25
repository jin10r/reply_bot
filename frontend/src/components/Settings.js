import React, { useState, useEffect } from "react";
import axios from "axios";
import { 
  Settings as SettingsIcon, 
  Bot, 
  Clock, 
  Shield, 
  MessageCircle, 
  Users, 
  Save,
  AlertCircle
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Switch } from "./ui/switch";
import { Label } from "./ui/label";
import { Checkbox } from "./ui/checkbox";
import { Textarea } from "./ui/textarea";
import { Slider } from "./ui/slider";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const Settings = () => {
  const [settings, setSettings] = useState(null);
  const [saving, setSaving] = useState(false);
  const [unsavedChanges, setUnsavedChanges] = useState(false);

  const fetchSettings = async () => {
    try {
      const response = await axios.get(`${API}/settings`);
      setSettings(response.data);
    } catch (error) {
      console.error("Failed to fetch settings:", error);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const updateSetting = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    setUnsavedChanges(true);
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      await axios.put(`${API}/settings`, settings);
      setUnsavedChanges(false);
      alert("Настройки сохранены успешно!");
    } catch (error) {
      alert("Ошибка сохранения настроек: " + error.response?.data?.detail || error.message);
    }
    setSaving(false);
  };

  const handleChatTypesChange = (chatType, checked) => {
    const newChatTypes = checked 
      ? [...settings.allowed_chat_types, chatType]
      : settings.allowed_chat_types.filter(type => type !== chatType);
    updateSetting("allowed_chat_types", newChatTypes);
  };

  if (!settings) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Загрузка настроек...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Настройки</h1>
          <p className="text-muted-foreground">
            Конфигурация поведения бота и параметров автоответов
          </p>
        </div>
        
        <Button 
          onClick={saveSettings} 
          disabled={saving || !unsavedChanges}
          size="lg"
        >
          <Save className="w-4 h-4 mr-2" />
          {saving ? "Сохранение..." : "Сохранить"}
        </Button>
      </div>

      {/* Unsaved Changes Alert */}
      {unsavedChanges && (
        <Card className="border-warning bg-warning/5">
          <CardContent className="flex items-center p-4">
            <AlertCircle className="w-5 h-5 text-warning mr-3" />
            <span className="text-sm">У вас есть несохраненные изменения</span>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* General Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Bot className="w-5 h-5 mr-2" />
              Общие настройки
            </CardTitle>
            <CardDescription>
              Основные параметры работы бота
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Автозапуск при старте</Label>
                <div className="text-sm text-muted-foreground">
                  Автоматически запускать бота при запуске сервера
                </div>
              </div>
              <Switch
                checked={settings.auto_start}
                onCheckedChange={(checked) => updateSetting("auto_start", checked)}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Логировать сообщения</Label>
                <div className="text-sm text-muted-foreground">
                  Сохранять входящие сообщения в журнал
                </div>
              </div>
              <Switch
                checked={settings.log_messages}
                onCheckedChange={(checked) => updateSetting("log_messages", checked)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Response Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Clock className="w-5 h-5 mr-2" />
              Настройки ответов
            </CardTitle>
            <CardDescription>
              Параметры задержки и лимитов ответов
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label>Минимальная задержка (секунды): {settings.response_delay_min}</Label>
              <Slider
                value={[settings.response_delay_min]}
                onValueChange={(value) => updateSetting("response_delay_min", value[0])}
                min={1}
                max={60}
                step={1}
                className="w-full"
              />
            </div>
            
            <div className="space-y-2">
              <Label>Максимальная задержка (секунды): {settings.response_delay_max}</Label>
              <Slider
                value={[settings.response_delay_max]}
                onValueChange={(value) => updateSetting("response_delay_max", value[0])}
                min={settings.response_delay_min}
                max={300}
                step={1}
                className="w-full"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="daily_limit">Дневной лимит ответов</Label>
              <Input
                id="daily_limit"
                type="number"
                min="1"
                max="10000"
                value={settings.max_daily_responses}
                onChange={(e) => updateSetting("max_daily_responses", parseInt(e.target.value) || 1000)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Chat Types */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <MessageCircle className="w-5 h-5 mr-2" />
              Типы чатов
            </CardTitle>
            <CardDescription>
              В каких типах чатов бот будет отвечать
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              { value: "private", label: "Личные сообщения", description: "Диалоги один на один" },
              { value: "group", label: "Группы", description: "Обычные группы до 200 человек" },
              { value: "supergroup", label: "Супергруппы", description: "Большие группы и каналы" }
            ].map((chatType) => (
              <div key={chatType.value} className="flex items-start space-x-3">
                <Checkbox
                  id={chatType.value}
                  checked={settings.allowed_chat_types.includes(chatType.value)}
                  onCheckedChange={(checked) => handleChatTypesChange(chatType.value, checked)}
                />
                <div className="space-y-1">
                  <Label htmlFor={chatType.value} className="text-sm font-medium">
                    {chatType.label}
                  </Label>
                  <div className="text-xs text-muted-foreground">
                    {chatType.description}
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* User Management */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Users className="w-5 h-5 mr-2" />
              Управление пользователями
            </CardTitle>
            <CardDescription>
              Черные и белые списки пользователей
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="blacklist">Черный список (ID пользователей через запятую)</Label>
              <Textarea
                id="blacklist"
                placeholder="123456789, 987654321"
                value={settings.blacklisted_users.join(", ")}
                onChange={(e) => {
                  const users = e.target.value.split(",").map(id => id.trim()).filter(id => id);
                  updateSetting("blacklisted_users", users);
                }}
              />
              <div className="text-xs text-muted-foreground">
                Пользователи из черного списка не получат ответов
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="whitelist">Белый список (ID пользователей через запятую)</Label>
              <Textarea
                id="whitelist"
                placeholder="123456789, 987654321"
                value={settings.whitelisted_users.join(", ")}
                onChange={(e) => {
                  const users = e.target.value.split(",").map(id => id.trim()).filter(id => id);
                  updateSetting("whitelisted_users", users);
                }}
              />
              <div className="text-xs text-muted-foreground">
                Если указан, бот будет отвечать только этим пользователям
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Current Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Shield className="w-5 h-5 mr-2" />
            Текущий статус
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">{settings.status}</div>
              <div className="text-sm text-muted-foreground">Статус бота</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{settings.daily_response_count}</div>
              <div className="text-sm text-muted-foreground">Ответов сегодня</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{settings.allowed_chat_types.length}</div>
              <div className="text-sm text-muted-foreground">Типов чатов</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">
                {new Date(settings.last_reset_date).toLocaleDateString("ru-RU")}
              </div>
              <div className="text-sm text-muted-foreground">Последний сброс</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Safety Notice */}
      <Card className="border-warning bg-warning/5">
        <CardContent className="p-4">
          <div className="flex items-start space-x-3">
            <AlertCircle className="w-5 h-5 text-warning mt-0.5" />
            <div className="space-y-1">
              <div className="font-medium text-warning">Важная информация</div>
              <div className="text-sm text-muted-foreground">
                • Не используйте основной аккаунт Telegram для бота<br/>
                • Соблюдайте лимиты API Telegram (не более 30 сообщений в секунду)<br/>
                • Регулярно проверяйте логи для выявления проблем<br/>
                • Используйте разумные задержки между ответами
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Settings;