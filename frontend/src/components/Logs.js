import React, { useState, useEffect } from "react";
import axios from "axios";
import { 
  FileText, 
  MessageCircle, 
  Users, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  Filter,
  Search,
  RefreshCw
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Badge } from "./ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const Logs = () => {
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API}/logs?limit=50`);
      setLogs(response.data);
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
    fetchLogs();
    fetchStats();
    const interval = setInterval(() => {
      fetchLogs();
      fetchStats();
    }, 10000); // Refresh every 10 seconds
    return () => clearInterval(interval);
  }, []);

  const filteredLogs = logs.filter(log => {
    const matchesSearch = searchTerm === "" || 
      log.message_text?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.action_taken?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || 
      (statusFilter === "success" && log.success) ||
      (statusFilter === "error" && !log.success);
    
    return matchesSearch && matchesStatus;
  });

  const getStatusInfo = (success) => {
    return success 
      ? { icon: CheckCircle, color: "text-success", variant: "success", text: "Успешно" }
      : { icon: XCircle, color: "text-destructive", variant: "destructive", text: "Ошибка" };
  };

  const getChatTypeInfo = (chatType) => {
    switch (chatType) {
      case "private":
        return { text: "Личные", variant: "default" };
      case "group":
        return { text: "Группа", variant: "secondary" };
      case "supergroup":
        return { text: "Супергруппа", variant: "outline" };
      default:
        return { text: chatType, variant: "secondary" };
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Журнал активности</h1>
          <p className="text-muted-foreground">
            История автоматических ответов и активности бота
          </p>
        </div>
        
        <Button onClick={fetchLogs} disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Обновить
        </Button>
      </div>

      {/* Statistics Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Всего ответов</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total_responses}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Успешных</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-success">{stats.successful_responses}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Ошибок</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">{stats.failed_responses}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Успешность</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">
                {stats.success_rate.toFixed(1)}%
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Фильтры и поиск</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Поиск по сообщениям, пользователям, действиям..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Статус" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все статусы</SelectItem>
                <SelectItem value="success">Только успешные</SelectItem>
                <SelectItem value="error">Только ошибки</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Logs List */}
      <div className="space-y-3">
        {filteredLogs.map((log) => {
          const statusInfo = getStatusInfo(log.success);
          const chatTypeInfo = getChatTypeInfo(log.chat_type);
          const StatusIcon = statusInfo.icon;
          
          return (
            <Card key={log.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-4 flex-1">
                    {/* Status Icon */}
                    <div className="mt-1">
                      <StatusIcon className={`w-5 h-5 ${statusInfo.color}`} />
                    </div>
                    
                    {/* Main Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-3 mb-2">
                        <div className="flex items-center space-x-2">
                          <Users className="w-4 h-4 text-muted-foreground" />
                          <span className="font-medium">
                            {log.first_name || log.username || `User ${log.user_id}`}
                          </span>
                          {log.username && (
                            <span className="text-sm text-muted-foreground">@{log.username}</span>
                          )}
                        </div>
                        
                        <Badge variant={chatTypeInfo.variant}>
                          {chatTypeInfo.text}
                        </Badge>
                        
                        <Badge variant={statusInfo.variant}>
                          {statusInfo.text}
                        </Badge>
                      </div>
                      
                      {/* Message */}
                      {log.message_text && (
                        <div className="mb-2">
                          <MessageCircle className="w-4 h-4 inline mr-2 text-muted-foreground" />
                          <span className="text-sm bg-muted px-2 py-1 rounded">
                            {log.message_text.length > 100 
                              ? `${log.message_text.substring(0, 100)}...` 
                              : log.message_text
                            }
                          </span>
                        </div>
                      )}
                      
                      {/* Action */}
                      <div className="text-sm text-muted-foreground mb-2">
                        <strong>Действие:</strong> {log.action_taken}
                      </div>
                      
                      {/* Error Message */}
                      {!log.success && log.error_message && (
                        <div className="text-sm text-destructive bg-destructive/10 px-2 py-1 rounded">
                          <AlertTriangle className="w-3 h-3 inline mr-1" />
                          {log.error_message}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Timestamp */}
                  <div className="flex items-center space-x-1 text-xs text-muted-foreground ml-4">
                    <Clock className="w-3 h-3" />
                    <span>{new Date(log.timestamp).toLocaleString("ru-RU")}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Empty State */}
      {filteredLogs.length === 0 && (
        <Card className="text-center py-12">
          <CardContent>
            <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <CardTitle className="mb-2">
              {logs.length === 0 ? "Нет записей в журнале" : "Нет записей по фильтру"}
            </CardTitle>
            <CardDescription>
              {logs.length === 0 
                ? "Журнал активности появится после первых автоответов" 
                : "Попробуйте изменить параметры поиска или фильтры"
              }
            </CardDescription>
          </CardContent>
        </Card>
      )}

      {/* Load More Button */}
      {logs.length > 0 && logs.length % 50 === 0 && (
        <div className="text-center">
          <Button variant="outline" onClick={fetchLogs}>
            Загрузить еще
          </Button>
        </div>
      )}
    </div>
  );
};

export default Logs;