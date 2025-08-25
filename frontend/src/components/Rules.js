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
  Toggle
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Switch } from "./ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const Rules = () => {
  const [rules, setRules] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);

  const fetchRules = async () => {
    try {
      const response = await axios.get(`${API}/rules`);
      setRules(response.data);
    } catch (error) {
      console.error("Failed to fetch rules:", error);
    }
  };

  useEffect(() => {
    fetchRules();
  }, []);

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

  const getConditionTypeIcon = (type) => {
    switch (type) {
      case "chat_type": return MessageCircle;
      case "user_id": return Users;
      case "username": return Users;
      case "keyword": return Hash;
      default: return Zap;
    }
  };

  const getConditionTypeName = (type) => {
    switch (type) {
      case "chat_type": return "Тип чата";
      case "user_id": return "ID пользователя";
      case "username": return "Имя пользователя";
      case "keyword": return "Ключевое слово";
      case "all": return "Все сообщения";
      default: return type;
    }
  };

  const getActionTypeName = (type) => {
    switch (type) {
      case "send_image": return "Отправить картинку";
      case "send_text": return "Отправить текст";
      case "send_both": return "Текст и картинка";
      default: return type;
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Правила автоответов</h1>
          <p className="text-muted-foreground">
            Настройка автоматических ответов на входящие сообщения
          </p>
        </div>
        
        <Dialog open={showAddForm} onOpenChange={setShowAddForm}>
          <DialogTrigger asChild>
            <Button size="lg">
              <Plus className="w-4 h-4 mr-2" />
              Создать правило
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Создать новое правило</DialogTitle>
              <DialogDescription>
                Настройте условия и действия для автоответа
              </DialogDescription>
            </DialogHeader>
            <div className="py-4 text-center text-muted-foreground">
              Форма создания правил будет реализована в следующих обновлениях
            </div>
            <DialogFooter>
              <Button onClick={() => setShowAddForm(false)}>Закрыть</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Всего правил</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{rules.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Активных</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">
              {rules.filter(rule => rule.is_active).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Отключенных</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-muted-foreground">
              {rules.filter(rule => !rule.is_active).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Срабатываний</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              {rules.reduce((sum, rule) => sum + (rule.usage_count || 0), 0)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Rules List */}
      <div className="space-y-4">
        {rules.map((rule) => (
          <Card key={rule.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className={`w-3 h-3 rounded-full ${rule.is_active ? 'bg-success' : 'bg-muted-foreground'}`} />
                  <div>
                    <CardTitle className="text-lg">{rule.name}</CardTitle>
                    <CardDescription>
                      Приоритет: {rule.priority} • Использований: {rule.usage_count || 0}
                    </CardDescription>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={rule.is_active}
                    onCheckedChange={() => toggleRuleActive(rule.id, rule.is_active)}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
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
                  {rule.conditions.map((condition, index) => {
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
                  {rule.actions.map((action, index) => (
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
      {rules.length === 0 && (
        <Card className="text-center py-12">
          <CardContent>
            <Zap className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <CardTitle className="mb-2">Нет настроенных правил</CardTitle>
            <CardDescription className="mb-4">
              Создайте первое правило автоответа для начала работы
            </CardDescription>
            <Button onClick={() => setShowAddForm(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Создать правило
            </Button>
          </CardContent>
        </Card>
      )}

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
                Настройте когда должно сработать правило: тип чата, пользователь, ключевые слова
              </p>
            </div>
            <div className="space-y-2">
              <div className="w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-medium">
                2
              </div>
              <h4 className="font-medium">Действия</h4>
              <p className="text-sm text-muted-foreground">
                Выберите что отправить: картинку, текст или и то, и другое
              </p>
            </div>
            <div className="space-y-2">
              <div className="w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-medium">
                3
              </div>
              <h4 className="font-medium">Приоритет</h4>
              <p className="text-sm text-muted-foreground">
                Правила с высшим приоритетом выполняются первыми
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Rules;