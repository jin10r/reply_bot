import React, { useState, useEffect } from "react";
import axios from "axios";
import { 
  Plus, 
  Trash2, 
  Phone, 
  Key, 
  AlertCircle,
  CheckCircle,
  Clock,
  User,
  Smartphone
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Badge } from "./ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { Label } from "./ui/label";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const Accounts = () => {
  const [accounts, setAccounts] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showVerifyForm, setShowVerifyForm] = useState(false);
  const [show2FAForm, setShow2FAForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    phone: "",
    api_id: "",
    api_hash: "",
    verification_code: "",
    twofa_password: ""
  });
  const [verificationId, setVerificationId] = useState("");

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

  const sendCode = async () => {
    setLoading(true);
    try {
      const response = await axios.post(`${API}/accounts/send-code`, {
        phone: formData.phone,
        api_id: parseInt(formData.api_id),
        api_hash: formData.api_hash
      });
      
      if (response.data.success) {
        setVerificationId(response.data.data.verification_id);
        setShowAddForm(false);
        setShowVerifyForm(true);
      } else {
        alert("Ошибка: " + response.data.message);
      }
    } catch (error) {
      alert("Ошибка отправки кода: " + error.response?.data?.detail || error.message);
    }
    setLoading(false);
  };

  const verifyCode = async () => {
    setLoading(true);
    try {
      const response = await axios.post(`${API}/accounts/verify-code`, {
        verification_id: verificationId,
        code: formData.verification_code
      });
      
      if (response.data.success) {
        // Check if 2FA is required
        if (response.data.data?.requires_2fa) {
          setShowVerifyForm(false);
          setShow2FAForm(true);
        } else {
          // Account created successfully without 2FA
          setShowVerifyForm(false);
          setFormData({ phone: "", api_id: "", api_hash: "", verification_code: "", twofa_password: "" });
          setVerificationId("");
          await fetchAccounts();
          alert("Аккаунт успешно добавлен!");
        }
      } else {
        alert("Ошибка верификации: " + response.data.message);
      }
    } catch (error) {
      alert("Ошибка верификации: " + error.response?.data?.detail || error.message);
    }
    setLoading(false);
  };

  const deleteAccount = async (accountId) => {
    if (!window.confirm("Вы уверены, что хотите удалить этот аккаунт?")) {
      return;
    }
    
    try {
      await axios.delete(`${API}/accounts/${accountId}`);
      await fetchAccounts();
      alert("Аккаунт удален");
    } catch (error) {
      alert("Ошибка удаления: " + error.response?.data?.detail || error.message);
    }
  };

  const getStatusInfo = (status) => {
    switch (status) {
      case "connected":
        return { 
          text: "Подключен", 
          variant: "success", 
          icon: CheckCircle,
          color: "text-success"
        };
      case "connecting":
        return { 
          text: "Подключение", 
          variant: "warning", 
          icon: Clock,
          color: "text-warning"
        };
      case "disconnected":
        return { 
          text: "Отключен", 
          variant: "secondary", 
          icon: AlertCircle,
          color: "text-muted-foreground"
        };
      case "error":
        return { 
          text: "Ошибка", 
          variant: "destructive", 
          icon: AlertCircle,
          color: "text-destructive"
        };
      default:
        return { 
          text: "Неизвестно", 
          variant: "secondary", 
          icon: AlertCircle,
          color: "text-muted-foreground"
        };
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Аккаунты</h1>
          <p className="text-muted-foreground">
            Управление Telegram аккаунтами для userbot
          </p>
        </div>
        
        <Dialog open={showAddForm} onOpenChange={setShowAddForm}>
          <DialogTrigger asChild>
            <Button size="lg">
              <Plus className="w-4 h-4 mr-2" />
              Добавить аккаунт
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Добавить Telegram аккаунт</DialogTitle>
              <DialogDescription>
                Введите данные для подключения аккаунта Telegram
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="phone">Номер телефона</Label>
                <Input
                  id="phone"
                  placeholder="+7XXXXXXXXXX"
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="api_id">API ID</Label>
                <Input
                  id="api_id"
                  placeholder="Получить на my.telegram.org"
                  value={formData.api_id}
                  onChange={(e) => setFormData({...formData, api_id: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="api_hash">API Hash</Label>
                <Input
                  id="api_hash"
                  placeholder="Получить на my.telegram.org"
                  value={formData.api_hash}
                  onChange={(e) => setFormData({...formData, api_hash: e.target.value})}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" onClick={sendCode} disabled={loading}>
                {loading ? "Отправка..." : "Отправить код"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Verification Dialog */}
      <Dialog open={showVerifyForm} onOpenChange={setShowVerifyForm}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Верификация аккаунта</DialogTitle>
            <DialogDescription>
              Введите код подтверждения, отправленный в Telegram
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="verification_code">Код подтверждения</Label>
              <Input
                id="verification_code"
                placeholder="12345"
                value={formData.verification_code}
                onChange={(e) => setFormData({...formData, verification_code: e.target.value})}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" onClick={verifyCode} disabled={loading}>
              {loading ? "Проверка..." : "Подтвердить"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Accounts List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {accounts.map((account) => {
          const statusInfo = getStatusInfo(account.status);
          const StatusIcon = statusInfo.icon;
          
          return (
            <Card key={account.id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                      <User className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-base">
                        {account.first_name && account.last_name 
                          ? `${account.first_name} ${account.last_name}`
                          : account.phone
                        }
                      </CardTitle>
                      {account.username && (
                        <CardDescription>@{account.username}</CardDescription>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => deleteAccount(account.id)}
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Smartphone className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">
                      {account.phone}
                    </span>
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <StatusIcon className={`w-4 h-4 ${statusInfo.color}`} />
                    <span className="text-sm font-medium">
                      {statusInfo.text}
                    </span>
                  </div>
                  <Badge variant={statusInfo.variant}>
                    {account.status}
                  </Badge>
                </div>

                {account.last_active && (
                  <div className="text-xs text-muted-foreground">
                    Последняя активность: {new Date(account.last_active).toLocaleString("ru-RU")}
                  </div>
                )}

                {account.error_message && (
                  <div className="text-xs text-destructive bg-destructive/10 p-2 rounded-lg">
                    {account.error_message}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Empty State */}
      {accounts.length === 0 && (
        <Card className="text-center py-12">
          <CardContent>
            <Smartphone className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <CardTitle className="mb-2">Нет подключенных аккаунтов</CardTitle>
            <CardDescription className="mb-4">
              Добавьте первый Telegram аккаунт для начала работы с userbot
            </CardDescription>
            <Button onClick={() => setShowAddForm(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Добавить аккаунт
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Instructions Card */}
      <Card>
        <CardHeader>
          <CardTitle>Как добавить аккаунт</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <div className="w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-medium">
                1
              </div>
              <h4 className="font-medium">Получите API ключи</h4>
              <p className="text-sm text-muted-foreground">
                Перейдите на <a href="https://my.telegram.org" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">my.telegram.org</a> и создайте приложение
              </p>
            </div>
            <div className="space-y-2">
              <div className="w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-medium">
                2
              </div>
              <h4 className="font-medium">Введите данные</h4>
              <p className="text-sm text-muted-foreground">
                Укажите номер телефона, API ID и API Hash
              </p>
            </div>
            <div className="space-y-2">
              <div className="w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-medium">
                3
              </div>
              <h4 className="font-medium">Подтвердите код</h4>
              <p className="text-sm text-muted-foreground">
                Введите код подтверждения из Telegram
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Accounts;