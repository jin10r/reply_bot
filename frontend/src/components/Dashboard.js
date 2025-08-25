import React, { useState, useEffect } from "react";
import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const Dashboard = () => {
  const [botStatus, setBotStatus] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchBotStatus = async () => {
    try {
      const response = await axios.get(`${API}/bot/status`);
      setBotStatus(response.data);
    } catch (error) {
      console.error("Failed to fetch bot status:", error);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await axios.get(`${API}/logs/stats`);
      setStats(response.data);
    } catch (error) {
      console.error("Failed to fetch stats:", error);
    }
  };

  useEffect(() => {
    fetchBotStatus();
    fetchStats();
    const interval = setInterval(() => {
      fetchBotStatus();
      fetchStats();
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const startBot = async () => {
    setLoading(true);
    try {
      await axios.post(`${API}/bot/start`);
      await fetchBotStatus();
    } catch (error) {
      alert("Ошибка запуска бота: " + error.response?.data?.detail || error.message);
    }
    setLoading(false);
  };

  const stopBot = async () => {
    setLoading(true);
    try {
      await axios.post(`${API}/bot/stop`);
      await fetchBotStatus();
    } catch (error) {
      alert("Ошибка остановки бота: " + error.response?.data?.detail || error.message);
    }
    setLoading(false);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "running": return "text-green-600 bg-green-100";
      case "stopped": return "text-gray-600 bg-gray-100";
      case "starting": return "text-yellow-600 bg-yellow-100";
      case "error": return "text-red-600 bg-red-100";
      default: return "text-gray-600 bg-gray-100";
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case "running": return "Запущен";
      case "stopped": return "Остановлен";
      case "starting": return "Запускается";
      case "error": return "Ошибка";
      default: return "Неизвестно";
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Dashboard</h1>
        
        {/* Bot Status */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100">Статус бота</p>
                <p className="text-2xl font-bold">
                  {botStatus ? getStatusText(botStatus.status) : "Загрузка..."}
                </p>
              </div>
              <div className="text-4xl">🤖</div>
            </div>
          </div>

          <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-lg p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100">Активных аккаунтов</p>
                <p className="text-2xl font-bold">
                  {botStatus ? botStatus.active_accounts : 0}
                </p>
              </div>
              <div className="text-4xl">👥</div>
            </div>
          </div>

          <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100">Ответов сегодня</p>
                <p className="text-2xl font-bold">
                  {stats ? stats.responses_today : 0}
                </p>
              </div>
              <div className="text-4xl">💬</div>
            </div>
          </div>
        </div>

        {/* Control Buttons */}
        <div className="flex space-x-4 mb-8">
          <button
            onClick={startBot}
            disabled={loading || (botStatus && botStatus.status === "running")}
            className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-6 py-3 rounded-lg font-medium transition-colors flex items-center space-x-2"
          >
            <span>▶️</span>
            <span>{loading ? "Запуск..." : "Запустить бот"}</span>
          </button>
          
          <button
            onClick={stopBot}
            disabled={loading || (botStatus && botStatus.status === "stopped")}
            className="bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white px-6 py-3 rounded-lg font-medium transition-colors flex items-center space-x-2"
          >
            <span>⏹️</span>
            <span>{loading ? "Остановка..." : "Остановить бот"}</span>
          </button>
        </div>

        {/* Statistics */}
        {stats && (
          <div className="bg-gray-50 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Статистика</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-blue-600">{stats.total_responses}</p>
                <p className="text-sm text-gray-600">Всего ответов</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600">{stats.successful_responses}</p>
                <p className="text-sm text-gray-600">Успешных</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-red-600">{stats.failed_responses}</p>
                <p className="text-sm text-gray-600">Ошибок</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-purple-600">{stats.success_rate.toFixed(1)}%</p>
                <p className="text-sm text-gray-600">Успешность</p>
              </div>
            </div>
          </div>
        )}

        {/* Daily Limit */}
        {botStatus && (
          <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-yellow-800">Дневной лимит</p>
                <p className="text-sm text-yellow-600">
                  {botStatus.daily_response_count} из {botStatus.max_daily_responses} ответов
                </p>
              </div>
              <div className="text-2xl">{botStatus.daily_response_count >= botStatus.max_daily_responses ? "🚫" : "✅"}</div>
            </div>
            <div className="mt-2 w-full bg-yellow-200 rounded-full h-2">
              <div 
                className="bg-yellow-600 h-2 rounded-full" 
                style={{
                  width: `${Math.min((botStatus.daily_response_count / botStatus.max_daily_responses) * 100, 100)}%`
                }}
              ></div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;