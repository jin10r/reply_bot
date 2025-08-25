import React, { useState, useEffect } from "react";
import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const Accounts = () => {
  const [accounts, setAccounts] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showCodeForm, setShowCodeForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [verificationId, setVerificationId] = useState("");
  
  const [formData, setFormData] = useState({
    phone: "",
    api_id: "",
    api_hash: ""
  });
  
  const [codeData, setCodeData] = useState({
    code: ""
  });

  const fetchAccounts = async () => {
    try {
      const response = await axios.get(`${API}/accounts`);
      setAccounts(response.data);
    } catch (error) {
      console.error("Failed to fetch accounts:", error);
    }
  };

  useEffect(() => {
    fetchAccounts();
  }, []);

  const handleSendCode = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const response = await axios.post(`${API}/accounts/send-code`, {
        phone: formData.phone,
        api_id: parseInt(formData.api_id),
        api_hash: formData.api_hash
      });
      
      setVerificationId(response.data.data.verification_id);
      setShowCodeForm(true);
      setShowAddForm(false);
    } catch (error) {
      alert("Ошибка отправки кода: " + (error.response?.data?.detail || error.message));
    }
    
    setLoading(false);
  };

  const handleVerifyCode = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      await axios.post(`${API}/accounts/verify-code`, {
        verification_id: verificationId,
        code: codeData.code
      });
      
      setShowCodeForm(false);
      setFormData({ phone: "", api_id: "", api_hash: "" });
      setCodeData({ code: "" });
      setVerificationId("");
      await fetchAccounts();
      alert("Аккаунт успешно добавлен!");
    } catch (error) {
      alert("Ошибка верификации: " + (error.response?.data?.detail || error.message));
    }
    
    setLoading(false);
  };

  const startAccount = async (accountId) => {
    try {
      await axios.post(`${API}/bot/start/${accountId}`);
      await fetchAccounts();
    } catch (error) {
      alert("Ошибка запуска аккаунта: " + (error.response?.data?.detail || error.message));
    }
  };

  const stopAccount = async (accountId) => {
    try {
      await axios.post(`${API}/bot/stop/${accountId}`);
      await fetchAccounts();
    } catch (error) {
      alert("Ошибка остановки аккаунта: " + (error.response?.data?.detail || error.message));
    }
  };

  const deleteAccount = async (accountId) => {
    if (!window.confirm("Вы уверены, что хотите удалить этот аккаунт?")) return;
    
    try {
      await axios.delete(`${API}/accounts/${accountId}`);
      await fetchAccounts();
    } catch (error) {
      alert("Ошибка удаления аккаунта: " + (error.response?.data?.detail || error.message));
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "connected": return "text-green-700 bg-green-100";
      case "disconnected": return "text-gray-700 bg-gray-100";
      case "connecting": return "text-yellow-700 bg-yellow-100";
      case "error": return "text-red-700 bg-red-100";
      default: return "text-gray-700 bg-gray-100";
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case "connected": return "Подключен";
      case "disconnected": return "Отключен";
      case "connecting": return "Подключается";
      case "error": return "Ошибка";
      default: return "Неизвестно";
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Telegram Аккаунты</h1>
          <button
            onClick={() => setShowAddForm(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium"
          >
            ➕ Добавить аккаунт
          </button>
        </div>

        {/* Add Account Form */}
        {showAddForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <h2 className="text-xl font-bold mb-4">Добавить Telegram аккаунт</h2>
              <form onSubmit={handleSendCode}>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Номер телефона
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    placeholder="+7XXXXXXXXXX"
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    API ID
                  </label>
                  <input
                    type="number"
                    value={formData.api_id}
                    onChange={(e) => setFormData({...formData, api_id: e.target.value})}
                    placeholder="Получите на my.telegram.org"
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    API Hash
                  </label>
                  <input
                    type="text"
                    value={formData.api_hash}
                    onChange={(e) => setFormData({...formData, api_hash: e.target.value})}
                    placeholder="Получите на my.telegram.org"
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
                <div className="flex space-x-3">
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white py-2 px-4 rounded-lg font-medium"
                  >
                    {loading ? "Отправка..." : "Отправить код"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAddForm(false)}
                    className="flex-1 bg-gray-500 hover:bg-gray-600 text-white py-2 px-4 rounded-lg font-medium"
                  >
                    Отмена
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Verify Code Form */}
        {showCodeForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <h2 className="text-xl font-bold mb-4">Введите код подтверждения</h2>
              <p className="text-gray-600 mb-4">
                Код отправлен на {formData.phone}
              </p>
              <form onSubmit={handleVerifyCode}>
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Код подтверждения
                  </label>
                  <input
                    type="text"
                    value={codeData.code}
                    onChange={(e) => setCodeData({...codeData, code: e.target.value})}
                    placeholder="12345"
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-center text-lg"
                    required
                  />
                </div>
                <div className="flex space-x-3">
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white py-2 px-4 rounded-lg font-medium"
                  >
                    {loading ? "Проверка..." : "Подтвердить"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowCodeForm(false);
                      setShowAddForm(true);
                    }}
                    className="flex-1 bg-gray-500 hover:bg-gray-600 text-white py-2 px-4 rounded-lg font-medium"
                  >
                    Назад
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Accounts List */}
        <div className="space-y-4">
          {accounts.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">📱</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Нет добавленных аккаунтов
              </h3>
              <p className="text-gray-600">
                Добавьте Telegram аккаунт для начала работы
              </p>
            </div>
          ) : (
            accounts.map((account) => (
              <div key={account.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-xl">👤</span>
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        {account.first_name} {account.last_name}
                        {account.username && ` (@${account.username})`}
                      </h3>
                      <p className="text-sm text-gray-600">{account.phone}</p>
                      <div className="flex items-center space-x-2 mt-1">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(account.status)}`}>
                          {getStatusText(account.status)}
                        </span>
                        {account.last_active && (
                          <span className="text-xs text-gray-500">
                            Активен: {new Date(account.last_active).toLocaleString()}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    {account.status === "connected" ? (
                      <button
                        onClick={() => stopAccount(account.id)}
                        className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-sm"
                      >
                        ⏹️ Остановить
                      </button>
                    ) : (
                      <button
                        onClick={() => startAccount(account.id)}
                        className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded text-sm"
                        disabled={!account.session_string}
                      >
                        ▶️ Запустить
                      </button>
                    )}
                    <button
                      onClick={() => deleteAccount(account.id)}
                      className="bg-gray-500 hover:bg-gray-600 text-white px-3 py-1 rounded text-sm"
                    >
                      🗑️ Удалить
                    </button>
                  </div>
                </div>
                
                {account.error_message && (
                  <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm text-red-700">
                      ❌ {account.error_message}
                    </p>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default Accounts;