import React, { useState, useEffect } from "react";
import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const Rules = () => {
  const [rules, setRules] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [images, setImages] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingRule, setEditingRule] = useState(null);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    priority: 0,
    is_active: true,
    account_id: "",
    conditions: [
      { condition_type: "all", value: "", is_active: true }
    ],
    actions: [
      { action_type: "send_image", image_ids: [], text_message: "", delay_seconds: 0 }
    ]
  });

  const conditionTypes = [
    { value: "all", label: "Все сообщения" },
    { value: "chat_type", label: "Тип чата" },
    { value: "user_id", label: "ID пользователя" },
    { value: "username", label: "Юзернейм" },
    { value: "keyword", label: "Ключевое слово" }
  ];

  const chatTypes = [
    { value: "private", label: "Личные сообщения" },
    { value: "group", label: "Группы" },
    { value: "supergroup", label: "Супергруппы" }
  ];

  const actionTypes = [
    { value: "send_image", label: "Отправить картинку" },
    { value: "send_text", label: "Отправить текст" },
    { value: "send_both", label: "Отправить текст и картинку" }
  ];

  const fetchRules = async () => {
    try {
      const response = await axios.get(`${API}/rules`);
      setRules(response.data);
    } catch (error) {
      console.error("Failed to fetch rules:", error);
    }
  };

  const fetchAccounts = async () => {
    try {
      const response = await axios.get(`${API}/accounts`);
      setAccounts(response.data);
    } catch (error) {
      console.error("Failed to fetch accounts:", error);
    }
  };

  const fetchImages = async () => {
    try {
      const response = await axios.get(`${API}/images`);
      setImages(response.data);
    } catch (error) {
      console.error("Failed to fetch images:", error);
    }
  };

  useEffect(() => {
    fetchRules();
    fetchAccounts();
    fetchImages();
  }, []);

  const resetForm = () => {
    setFormData({
      name: "",
      priority: 0,
      is_active: true,
      account_id: "",
      conditions: [
        { condition_type: "all", value: "", is_active: true }
      ],
      actions: [
        { action_type: "send_image", image_ids: [], text_message: "", delay_seconds: 0 }
      ]
    });
    setEditingRule(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (editingRule) {
        await axios.put(`${API}/rules/${editingRule.id}`, formData);
      } else {
        await axios.post(`${API}/rules`, formData);
      }
      
      setShowForm(false);
      resetForm();
      await fetchRules();
    } catch (error) {
      alert("Ошибка сохранения правила: " + (error.response?.data?.detail || error.message));
    }
    
    setLoading(false);
  };

  const editRule = (rule) => {
    setFormData({
      name: rule.name,
      priority: rule.priority,
      is_active: rule.is_active,
      account_id: rule.account_id || "",
      conditions: rule.conditions,
      actions: rule.actions
    });
    setEditingRule(rule);
    setShowForm(true);
  };

  const deleteRule = async (ruleId) => {
    if (!window.confirm("Вы уверены, что хотите удалить это правило?")) return;
    
    try {
      await axios.delete(`${API}/rules/${ruleId}`);
      await fetchRules();
    } catch (error) {
      alert("Ошибка удаления правила: " + (error.response?.data?.detail || error.message));
    }
  };

  const addCondition = () => {
    setFormData({
      ...formData,
      conditions: [
        ...formData.conditions,
        { condition_type: "all", value: "", is_active: true }
      ]
    });
  };

  const removeCondition = (index) => {
    const newConditions = formData.conditions.filter((_, i) => i !== index);
    setFormData({ ...formData, conditions: newConditions });
  };

  const updateCondition = (index, field, value) => {
    const newConditions = [...formData.conditions];
    newConditions[index] = { ...newConditions[index], [field]: value };
    setFormData({ ...formData, conditions: newConditions });
  };

  const addAction = () => {
    setFormData({
      ...formData,
      actions: [
        ...formData.actions,
        { action_type: "send_image", image_ids: [], text_message: "", delay_seconds: 0 }
      ]
    });
  };

  const removeAction = (index) => {
    const newActions = formData.actions.filter((_, i) => i !== index);
    setFormData({ ...formData, actions: newActions });
  };

  const updateAction = (index, field, value) => {
    const newActions = [...formData.actions];
    newActions[index] = { ...newActions[index], [field]: value };
    setFormData({ ...formData, actions: newActions });
  };

  const toggleImageSelection = (actionIndex, imageId) => {
    const newActions = [...formData.actions];
    const currentImageIds = newActions[actionIndex].image_ids || [];
    
    if (currentImageIds.includes(imageId)) {
      newActions[actionIndex].image_ids = currentImageIds.filter(id => id !== imageId);
    } else {
      newActions[actionIndex].image_ids = [...currentImageIds, imageId];
    }
    
    setFormData({ ...formData, actions: newActions });
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Правила автоответов</h1>
          <button
            onClick={() => {
              resetForm();
              setShowForm(true);
            }}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium"
          >
            ➕ Добавить правило
          </button>
        </div>

        {/* Rules List */}
        <div className="space-y-4">
          {rules.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">⚡</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Нет настроенных правил
              </h3>
              <p className="text-gray-600">
                Создайте правило для автоматических ответов
              </p>
            </div>
          ) : (
            rules.map((rule) => (
              <div key={rule.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="font-semibold text-gray-900">{rule.name}</h3>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        rule.is_active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"
                      }`}>
                        {rule.is_active ? "Активно" : "Неактивно"}
                      </span>
                      <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                        Приоритет: {rule.priority}
                      </span>
                    </div>
                    
                    <div className="text-sm text-gray-600 mb-2">
                      <strong>Условия:</strong> {rule.conditions.map(c => 
                        conditionTypes.find(ct => ct.value === c.condition_type)?.label || c.condition_type
                      ).join(", ")}
                    </div>
                    
                    <div className="text-sm text-gray-600 mb-2">
                      <strong>Действия:</strong> {rule.actions.map(a => 
                        actionTypes.find(at => at.value === a.action_type)?.label || a.action_type
                      ).join(", ")}
                    </div>
                    
                    <div className="text-xs text-gray-500">
                      Использовано: {rule.usage_count} раз
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => editRule(rule)}
                      className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-sm"
                    >
                      ✏️ Изменить
                    </button>
                    <button
                      onClick={() => deleteRule(rule.id)}
                      className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-sm"
                    >
                      🗑️ Удалить
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Rule Form Modal */}
        {showForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
            <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-screen overflow-y-auto m-4">
              <h2 className="text-xl font-bold mb-4">
                {editingRule ? "Редактировать правило" : "Добавить правило"}
              </h2>
              
              <form onSubmit={handleSubmit}>
                {/* Basic Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Название правила
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Приоритет (больше = выше)
                    </label>
                    <input
                      type="number"
                      value={formData.priority}
                      onChange={(e) => setFormData({...formData, priority: parseInt(e.target.value)})}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Аккаунт (оставьте пустым для всех)
                    </label>
                    <select
                      value={formData.account_id}
                      onChange={(e) => setFormData({...formData, account_id: e.target.value})}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Все аккаунты</option>
                      {accounts.map(account => (
                        <option key={account.id} value={account.id}>
                          {account.phone} - {account.first_name} {account.last_name}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="flex items-center">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={formData.is_active}
                        onChange={(e) => setFormData({...formData, is_active: e.target.checked})}
                        className="mr-2"
                      />
                      Активное правило
                    </label>
                  </div>
                </div>

                {/* Conditions */}
                <div className="mb-6">
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="text-lg font-semibold">Условия срабатывания</h3>
                    <button
                      type="button"
                      onClick={addCondition}
                      className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm"
                    >
                      ➕ Добавить условие
                    </button>
                  </div>
                  
                  {formData.conditions.map((condition, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-4 mb-3">
                      <div className="flex items-center space-x-3">
                        <select
                          value={condition.condition_type}
                          onChange={(e) => updateCondition(index, "condition_type", e.target.value)}
                          className="p-2 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
                        >
                          {conditionTypes.map(type => (
                            <option key={type.value} value={type.value}>
                              {type.label}
                            </option>
                          ))}
                        </select>
                        
                        {condition.condition_type === "chat_type" && (
                          <select
                            value={condition.value}
                            onChange={(e) => updateCondition(index, "value", e.target.value)}
                            className="p-2 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
                          >
                            <option value="">Выберите тип чата</option>
                            {chatTypes.map(type => (
                              <option key={type.value} value={type.value}>
                                {type.label}
                              </option>
                            ))}
                          </select>
                        )}
                        
                        {["user_id", "username", "keyword"].includes(condition.condition_type) && (
                          <input
                            type="text"
                            value={condition.value}
                            onChange={(e) => updateCondition(index, "value", e.target.value)}
                            placeholder={
                              condition.condition_type === "user_id" ? "123456789" :
                              condition.condition_type === "username" ? "username" :
                              "ключевое слово"
                            }
                            className="p-2 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
                          />
                        )}
                        
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={condition.is_active}
                            onChange={(e) => updateCondition(index, "is_active", e.target.checked)}
                            className="mr-1"
                          />
                          Активно
                        </label>
                        
                        {formData.conditions.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeCondition(index)}
                            className="text-red-600 hover:text-red-800"
                          >
                            🗑️
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Actions */}
                <div className="mb-6">
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="text-lg font-semibold">Действия</h3>
                    <button
                      type="button"
                      onClick={addAction}
                      className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm"
                    >
                      ➕ Добавить действие
                    </button>
                  </div>
                  
                  {formData.actions.map((action, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-4 mb-3">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                        <select
                          value={action.action_type}
                          onChange={(e) => updateAction(index, "action_type", e.target.value)}
                          className="p-2 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
                        >
                          {actionTypes.map(type => (
                            <option key={type.value} value={type.value}>
                              {type.label}
                            </option>
                          ))}
                        </select>
                        
                        <input
                          type="number"
                          value={action.delay_seconds}
                          onChange={(e) => updateAction(index, "delay_seconds", parseInt(e.target.value) || 0)}
                          placeholder="Задержка (сек)"
                          className="p-2 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                      
                      {["send_text", "send_both"].includes(action.action_type) && (
                        <div className="mb-3">
                          <textarea
                            value={action.text_message}
                            onChange={(e) => updateAction(index, "text_message", e.target.value)}
                            placeholder="Текст сообщения"
                            rows={3}
                            className="w-full p-2 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>
                      )}
                      
                      {["send_image", "send_both"].includes(action.action_type) && (
                        <div className="mb-3">
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Выберите картинки:
                          </label>
                          <div className="grid grid-cols-3 md:grid-cols-6 gap-2 max-h-48 overflow-y-auto">
                            {images.map(image => (
                              <div
                                key={image.id}
                                className={`relative border-2 rounded-lg p-2 cursor-pointer transition-colors ${
                                  action.image_ids?.includes(image.id)
                                    ? "border-blue-500 bg-blue-50"
                                    : "border-gray-200 hover:border-gray-300"
                                }`}
                                onClick={() => toggleImageSelection(index, image.id)}
                              >
                                <img
                                  src={`${BACKEND_URL}/uploads/${image.filename}`}
                                  alt={image.original_filename}
                                  className="w-full h-16 object-cover rounded"
                                />
                                <p className="text-xs text-gray-600 mt-1 truncate">
                                  {image.original_filename}
                                </p>
                                {action.image_ids?.includes(image.id) && (
                                  <div className="absolute top-1 right-1 bg-blue-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">
                                    ✓
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {formData.actions.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeAction(index)}
                          className="text-red-600 hover:text-red-800"
                        >
                          🗑️ Удалить действие
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                <div className="flex space-x-3">
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white py-3 px-4 rounded-lg font-medium"
                  >
                    {loading ? "Сохранение..." : (editingRule ? "Сохранить изменения" : "Создать правило")}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowForm(false);
                      resetForm();
                    }}
                    className="flex-1 bg-gray-500 hover:bg-gray-600 text-white py-3 px-4 rounded-lg font-medium"
                  >
                    Отмена
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Rules;