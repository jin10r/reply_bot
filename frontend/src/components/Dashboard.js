import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "../i18n";
import { 
  Bot, 
  Users, 
  MessageCircle, 
  Activity, 
  Play, 
  Square, 
  Loader2,
  TrendingUp,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Zap,
  Image
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Progress } from "./ui/progress";
import { Badge } from "./ui/badge";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const Dashboard = () => {
  const [botStatus, setBotStatus] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { t } = useTranslation();

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
      alert(t('messages.botStartError', { error: error.response?.data?.detail || error.message }));
    }
    setLoading(false);
  };

  const stopBot = async () => {
    setLoading(true);
    try {
      await axios.post(`${API}/bot/stop`);
      await fetchBotStatus();
    } catch (error) {
      alert(t('messages.botStopError', { error: error.response?.data?.detail || error.message }));
    }
    setLoading(false);
  };

  const getStatusInfo = (status) => {
    switch (status) {
      case "running":
        return {
          text: t('dashboard.running'),
          variant: "success",
          icon: CheckCircle,
          color: "text-success"
        };
      case "stopped":
        return {
          text: t('dashboard.stopped'), 
          variant: "secondary",
          icon: Square,
          color: "text-muted-foreground"
        };
      case "starting":
        return {
          text: t('dashboard.starting'),
          variant: "warning",
          icon: Clock,
          color: "text-warning"
        };
      case "error":
        return {
          text: t('dashboard.error'),
          variant: "destructive",
          icon: XCircle,
          color: "text-destructive"
        };
      default:
        return {
          text: t('dashboard.unknown'),
          variant: "secondary",
          icon: AlertCircle,
          color: "text-muted-foreground"
        };
    }
  };

  const statusInfo = botStatus ? getStatusInfo(botStatus.status) : null;
  const StatusIcon = statusInfo?.icon;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('dashboard.title')}</h1>
          <p className="text-muted-foreground">
            {t('dashboard.subtitle')}
          </p>
        </div>
        
        {/* Bot Control Buttons */}
        <div className="flex items-center space-x-3">
          <Button
            onClick={startBot}
            disabled={loading || (botStatus && botStatus.status === "running")}
            className="bg-success hover:bg-success/90 text-success-foreground"
            size="lg"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Play className="w-4 h-4 mr-2" />
            )}
            {loading ? "Запуск..." : "Запустить"}
          </Button>
          
          <Button
            onClick={stopBot}
            disabled={loading || (botStatus && botStatus.status === "stopped")}
            variant="destructive"
            size="lg"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Square className="w-4 h-4 mr-2" />
            )}
            {loading ? "Остановка..." : "Остановить"}
          </Button>
        </div>
      </div>

      {/* Main Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Bot Status */}
        <Card className="border-l-4 border-l-primary">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Статус бота</CardTitle>
            <Bot className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              {StatusIcon && <StatusIcon className={`w-5 h-5 ${statusInfo.color}`} />}
              <div>
                <div className="text-2xl font-bold">
                  {statusInfo?.text || "Загрузка..."}
                </div>
                {botStatus && (
                  <Badge variant={statusInfo.variant} className="mt-1">
                    {botStatus.is_running ? "Online" : "Offline"}
                  </Badge>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Active Accounts */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Активные аккаунты</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {botStatus ? botStatus.active_accounts : 0}
            </div>
            <p className="text-xs text-muted-foreground">
              подключенных аккаунтов
            </p>
          </CardContent>
        </Card>

        {/* Today's Responses */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ответов сегодня</CardTitle>
            <MessageCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats ? stats.responses_today : 0}
            </div>
            <p className="text-xs text-muted-foreground">
              автоматических ответов
            </p>
          </CardContent>
        </Card>

        {/* Success Rate */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Успешность</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats ? `${stats.success_rate.toFixed(1)}%` : "0%"}
            </div>
            <p className="text-xs text-muted-foreground">
              успешных ответов
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Statistics */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Response Statistics */}
          <Card>
            <CardHeader>
              <CardTitle>Статистика ответов</CardTitle>
              <CardDescription>
                Общая статистика автоответов системы
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Всего ответов</span>
                    <span className="font-medium">{stats.total_responses}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-success">Успешных</span>
                    <span className="font-medium text-success">{stats.successful_responses}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-destructive">Ошибок</span>
                    <span className="font-medium text-destructive">{stats.failed_responses}</span>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-muted-foreground">Успешность</span>
                      <span className="text-xs font-medium">{stats.success_rate.toFixed(1)}%</span>
                    </div>
                    <Progress value={stats.success_rate} className="h-2" />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Daily Limit */}
          <Card>
            <CardHeader>
              <CardTitle>Дневной лимит</CardTitle>
              <CardDescription>
                Контроль количества ответов в день
              </CardDescription>
            </CardHeader>
            <CardContent>
              {botStatus && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Использовано</span>
                    <span className="font-medium">
                      {botStatus.daily_response_count} из {botStatus.max_daily_responses}
                    </span>
                  </div>
                  
                  <Progress 
                    value={Math.min((botStatus.daily_response_count / botStatus.max_daily_responses) * 100, 100)}
                    className="h-3"
                  />
                  
                  <div className="flex items-center space-x-2">
                    {botStatus.daily_response_count >= botStatus.max_daily_responses ? (
                      <>
                        <XCircle className="w-4 h-4 text-destructive" />
                        <span className="text-sm text-destructive">Лимит достигнут</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-4 h-4 text-success" />
                        <span className="text-sm text-success">
                          Осталось: {botStatus.max_daily_responses - botStatus.daily_response_count} ответов
                        </span>
                      </>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Быстрые действия</CardTitle>
          <CardDescription>
            Часто используемые функции управления
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Button 
              variant="outline" 
              className="h-20 flex-col space-y-2"
              onClick={() => navigate('/accounts')}
            >
              <Users className="w-6 h-6" />
              <span className="text-sm">Аккаунты</span>
            </Button>
            <Button 
              variant="outline" 
              className="h-20 flex-col space-y-2"
              onClick={() => navigate('/rules')}
            >
              <Zap className="w-6 h-6" />
              <span className="text-sm">Правила</span>
            </Button>
            <Button 
              variant="outline" 
              className="h-20 flex-col space-y-2"
              onClick={() => navigate('/media')}
            >
              <Image className="w-6 h-6" />
              <span className="text-sm">Медиафайлы</span>
            </Button>
            <Button 
              variant="outline" 
              className="h-20 flex-col space-y-2"
              onClick={() => navigate('/logs')}
            >
              <Activity className="w-6 h-6" />
              <span className="text-sm">Логи</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;