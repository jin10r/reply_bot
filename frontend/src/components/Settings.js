import React, { useState, useEffect } from "react";
import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const Settings = () => {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");

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

  const handleSave = async () => {
    setLoading(true);
    setSaveMessage("");

    try {
      await axios.put(`${API}/settings`, settings);
      setSaveMessage("Настройки успешно сохранены!");
      setTimeout(() => setSaveMessage(""), 3000);
    } catch (error) {
      setSaveMessage("Ошибка сохранения настроек: " + (error.response?.data?.detail || error.message));
    }

    setLoading(false);
  };

  const updateSetting = (field, value) => {
    setSettings(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const addToList = (field, value) => {
    if (value.trim() && !settings[field].includes(value.trim())) {
      updateSetting(field, [...settings[field], value.trim()]);
    }
  };

  const removeFromList = (field, index) => {
    const newList = settings[field].filter((_, i) => i !== index);
    updateSetting(field, newList);
  };

  if (!settings) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Настройки бота</h1>
          <button
            onClick={handleSave}
            disabled={loading}
            className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-6 py-2 rounded-lg font-medium"
          >
            {loading ? "Сохранение..." : "💾 Сохранить"}
          </button>
        </div>

        {saveMessage && (
          <div className={`mb-6 p-4 rounded-lg ${
            saveMessage.includes("успешно") 
              ? "bg-green-50 border border-green-200 text-green-700"
              : "bg-red-50 border border-red-200 text-red-700"
          }`}>
            {saveMessage}
          </div>
        )}

        <div className="space-y-8">
          {/* General Settings */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">🤖 Общие настройки</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={settings.auto_start}
                    onChange={(e) => updateSetting("auto_start", e.target.checked)}
                    className="rounded"
                  />
                  <span className="text-sm font-medium text-gray-700">
                    Автозапуск при старте сервера
                  </span>
                </label>
              </div>
              
              <div>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={settings.log_messages}
                    onChange={(e) => updateSetting("log_messages", e.target.checked)}
                    className="rounded"
                  />
                  <span className="text-sm font-medium text-gray-700">
                    Логировать входящие сообщения
                  </span>
                </label>
              </div>
            </div>
          </section>

          {/* Response Settings */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">⏱️ Настройки ответов</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Мин. задержка ответа (сек)
                </label>
                <input
                  type="number"
                  min="0"
                  max="60"
                  value={settings.response_delay_min}
                  onChange={(e) => updateSetting("response_delay_min", parseInt(e.target.value) || 0)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Макс. задержка ответа (сек)
                </label>
                <input
                  type="number"
                  min="0"
                  max="300"
                  value={settings.response_delay_max}
                  onChange={(e) => updateSetting("response_delay_max", parseInt(e.target.value) || 0)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Лимит ответов в день
                </label>
                <input
                  type="number"
                  min="1"
                  max="10000"
                  value={settings.max_daily_responses}
                  onChange={(e) => updateSetting("max_daily_responses", parseInt(e.target.value) || 1000)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
            
            <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-700">
                💡 <strong>Совет:</strong> Установите случайную задержку между ответами, чтобы бот выглядел более естественно.
                Текущая задержка: {settings.response_delay_min}-{settings.response_delay_max} секунд.
              </p>
            </div>
          </section>

          {/* Chat Type Settings */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">💬 Типы чатов для ответов</h2>
            <div className="space-y-3">
              {[
                { value: "private", label: "Личные сообщения", icon: "👤" },
                { value: "group", label: "Группы", icon: "👥" },
                { value: "supergroup", label: "Супергруппы", icon: "👥" }
              ].map(chatType => (
                <label key={chatType.value} className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50">
                  <input
                    type="checkbox"
                    checked={settings.allowed_chat_types.includes(chatType.value)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        updateSetting("allowed_chat_types", [...settings.allowed_chat_types, chatType.value]);
                      } else {
                        updateSetting("allowed_chat_types", settings.allowed_chat_types.filter(ct => ct !== chatType.value));
                      }
                    }}
                    className="rounded"
                  />
                  <span className="text-xl">{chatType.icon}</span>
                  <span className="text-sm font-medium text-gray-700">
                    {chatType.label}
                  </span>
                </label>
              ))}
            </div>
          </section>

          {/* User Lists */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">👥 Управление пользователями</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Blacklist */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-3">🚫 Черный список</h3>
                <UserList
                  users={settings.blacklisted_users}
                  onAdd={(value) => addToList("blacklisted_users", value)}
                  onRemove={(index) => removeFromList("blacklisted_users", index)}
                  placeholder="Введите ID пользователя"
                  description="Пользователи из этого списка никогда не получат ответ"
                />
              </div>

              {/* Whitelist */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-3">✅ Белый список</h3>
                <UserList
                  users={settings.whitelisted_users}
                  onAdd={(value) => addToList("whitelisted_users", value)}
                  onRemove={(index) => removeFromList("whitelisted_users", index)}
                  placeholder="Введите ID пользователя"
                  description="Если список не пустой, ответы будут только этим пользователям"
                />
              </div>
            </div>
            
            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-700">
                💡 <strong>Как получить ID пользователя:</strong> Перешлите сообщение пользователя боту @userinfobot или добавьте его в группу с включенным логированием.
              </p>
            </div>
          </section>

          {/* Status Info */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">📊 Текущий статус</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-600">Статус</p>
                <p className="text-lg font-semibold text-gray-900 capitalize">
                  {settings.status === 'running' ? '🟢 Запущен' : 
                   settings.status === 'stopped' ? '🔴 Остановлен' : 
                   settings.status === 'starting' ? '🟡 Запускается' : '❌ Ошибка'}
                </p>
              </div>
              
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-600">Ответов сегодня</p>
                <p className="text-lg font-semibold text-gray-900">
                  {settings.daily_response_count}
                </p>
              </div>
              
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-600">Лимит в день</p>
                <p className="text-lg font-semibold text-gray-900">
                  {settings.max_daily_responses}
                </p>
              </div>
              
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-600">Последний сброс</p>
                <p className="text-lg font-semibold text-gray-900">
                  {new Date(settings.last_reset_date).toLocaleDateString()}
                </p>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

// UserList Component
const UserList = ({ users, onAdd, onRemove, placeholder, description }) => {
  const [newUser, setNewUser] = useState("");

  const handleAdd = () => {
    if (newUser.trim()) {
      onAdd(newUser);
      setNewUser("");
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleAdd();
    }
  };

  return (
    <div>
      <div className="flex space-x-2 mb-3">
        <input
          type="text"
          value={newUser}
          onChange={(e) => setNewUser(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder={placeholder}
          className="flex-1 p-2 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
        />
        <button
          onClick={handleAdd}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded font-medium"
        >
          ➕
        </button>
      </div>
      
      <div className="space-y-2 mb-3">
        {users.map((user, index) => (
          <div key={index} className="flex items-center justify-between bg-gray-100 p-2 rounded">
            <span className="text-sm">{user}</span>
            <button
              onClick={() => onRemove(index)}
              className="text-red-600 hover:text-red-800"
            >
              🗑️
            </button>
          </div>
        ))}
      </div>
      
      {users.length === 0 && (
        <p className="text-sm text-gray-500 italic">Список пуст</p>
      )}
      
      <p className="text-xs text-gray-600 mt-2">{description}</p>
    </div>
  );
};

export default Settings;