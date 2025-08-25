import React, { useState, useEffect } from "react";
import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const Logs = () => {
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [limit] = useState(50);
  const [hasMore, setHasMore] = useState(true);

  const fetchLogs = async (reset = false) => {
    setLoading(true);
    try {
      const currentPage = reset ? 0 : page;
      const response = await axios.get(`${API}/logs?skip=${currentPage * limit}&limit=${limit}`);
      
      if (reset) {
        setLogs(response.data);
        setPage(0);
      } else {
        setLogs(prev => [...prev, ...response.data]);
      }
      
      setHasMore(response.data.length === limit);
      if (!reset) setPage(prev => prev + 1);
    } catch (error) {
      console.error("Failed to fetch logs:", error);
    }
    setLoading(false);
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
    fetchLogs(true);
    fetchStats();
    
    const interval = setInterval(() => {
      fetchLogs(true);
      fetchStats();
    }, 10000); // Update every 10 seconds
    
    return () => clearInterval(interval);
  }, []);

  const formatTimestamp = (timestamp) => {
    return new Date(timestamp).toLocaleString('ru-RU');
  };

  const getChatTypeIcon = (chatType) => {
    switch (chatType.toLowerCase()) {
      case 'private': return '👤';
      case 'group': return '👥';
      case 'supergroup': return '👥';
      case 'channel': return '📢';
      default: return '💬';
    }
  };

  const getStatusIcon = (success) => {
    return success ? '✅' : '❌';
  };

  const getStatusColor = (success) => {
    return success ? 'text-green-600' : 'text-red-600';
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Логи активности</h1>

        {/* Statistics */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg p-4 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100 text-sm">Всего ответов</p>
                  <p className="text-2xl font-bold">{stats.total_responses}</p>
                </div>
                <div className="text-3xl">📊</div>
              </div>
            </div>

            <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-lg p-4 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-100 text-sm">Успешных</p>
                  <p className="text-2xl font-bold">{stats.successful_responses}</p>
                </div>
                <div className="text-3xl">✅</div>
              </div>
            </div>

            <div className="bg-gradient-to-r from-red-500 to-red-600 rounded-lg p-4 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-red-100 text-sm">Ошибок</p>
                  <p className="text-2xl font-bold">{stats.failed_responses}</p>
                </div>
                <div className="text-3xl">❌</div>
              </div>
            </div>

            <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg p-4 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-100 text-sm">Сегодня</p>
                  <p className="text-2xl font-bold">{stats.responses_today}</p>
                </div>
                <div className="text-3xl">📅</div>
              </div>
            </div>
          </div>
        )}

        {/* Refresh Button */}
        <div className="flex justify-between items-center mb-6">
          <div className="text-sm text-gray-600">
            Автообновление каждые 10 секунд
          </div>
          <button
            onClick={() => fetchLogs(true)}
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg font-medium"
          >
            🔄 Обновить
          </button>
        </div>

        {/* Logs List */}
        <div className="space-y-3">
          {logs.length === 0 && !loading ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">📋</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Нет логов активности
              </h3>
              <p className="text-gray-600">
                Логи появятся после активности бота
              </p>
            </div>
          ) : (
            logs.map((log) => (
              <div key={log.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <span className="text-xl">{getStatusIcon(log.success)}</span>
                      <span className="text-xl">{getChatTypeIcon(log.chat_type)}</span>
                      <div>
                        <h3 className="font-semibold text-gray-900">
                          {log.first_name || 'Неизвестный пользователь'}
                          {log.username && ` (@${log.username})`}
                        </h3>
                        <p className="text-sm text-gray-600">
                          ID: {log.user_id} • Чат: {log.chat_id}
                        </p>
                      </div>
                    </div>
                    
                    {log.message_text && (
                      <div className="mb-2 p-2 bg-gray-50 rounded text-sm">
                        <strong>Сообщение:</strong> {log.message_text}
                      </div>
                    )}
                    
                    <div className="text-sm text-gray-600 mb-2">
                      <strong>Действие:</strong> {log.action_taken}
                    </div>
                    
                    {log.error_message && (
                      <div className="text-sm text-red-600 mb-2">
                        <strong>Ошибка:</strong> {log.error_message}
                      </div>
                    )}
                    
                    <div className="text-xs text-gray-500">
                      {formatTimestamp(log.timestamp)}
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      log.success ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                    }`}>
                      {log.success ? "Успешно" : "Ошибка"}
                    </span>
                    <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                      {log.chat_type}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}

          {/* Load More Button */}
          {hasMore && logs.length > 0 && (
            <div className="text-center pt-6">
              <button
                onClick={() => fetchLogs()}
                disabled={loading}
                className="bg-gray-600 hover:bg-gray-700 disabled:bg-gray-400 text-white px-6 py-2 rounded-lg font-medium"
              >
                {loading ? "Загрузка..." : "Загрузить ещё"}
              </button>
            </div>
          )}

          {loading && logs.length === 0 && (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Загрузка логов...</p>
            </div>
          )}
        </div>

        {/* Export/Clear Options */}
        <div className="mt-8 pt-6 border-t border-gray-200">
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-600">
              Показано: {logs.length} записей
            </div>
            <div className="space-x-3">
              <button className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium text-sm">
                📄 Экспорт CSV
              </button>
              <button className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg font-medium text-sm">
                🗑️ Очистить старые
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Logs;