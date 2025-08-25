import React, { useState, useEffect } from "react";
import "./App.css";
import { BrowserRouter, Routes, Route, Link, useLocation } from "react-router-dom";
import { 
  Home, 
  Users, 
  Zap, 
  Image, 
  FileText, 
  Settings as SettingsIcon,
  Moon,
  Sun,
  Bot
} from "lucide-react";
import { cn } from "./lib/utils";
import Dashboard from "./components/Dashboard";
import Accounts from "./components/Accounts";
import Rules from "./components/Rules";
import Images from "./components/Images";
import Logs from "./components/Logs";
import Settings from "./components/Settings";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

// Theme provider
const ThemeProvider = ({ children }) => {
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('telegram-bot-theme');
    return saved ? JSON.parse(saved) : false;
  });

  useEffect(() => {
    localStorage.setItem('telegram-bot-theme', JSON.stringify(darkMode));
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  return (
    <div className={darkMode ? 'dark' : ''}>
      {children({ darkMode, setDarkMode })}
    </div>
  );
};

// Navigation component with Telegram-style sidebar
const Navigation = ({ darkMode, setDarkMode }) => {
  const location = useLocation();
  
  const navItems = [
    { path: "/", label: "Dashboard", icon: Home, description: "Главная панель" },
    { path: "/accounts", label: "Аккаунты", icon: Users, description: "Управление аккаунтами" },
    { path: "/rules", label: "Правила", icon: Zap, description: "Автоответы" },
    { path: "/images", label: "Картинки", icon: Image, description: "Медиафайлы" },
    { path: "/logs", label: "Логи", icon: FileText, description: "История активности" },
    { path: "/settings", label: "Настройки", icon: SettingsIcon, description: "Конфигурация" }
  ];

  return (
    <aside className="fixed left-0 top-0 h-full w-72 bg-sidebar border-r border-border transition-colors duration-200">
      {/* Header */}
      <div className="p-6 border-b border-border">
        <div className="flex items-center space-x-3 mb-2">
          <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
            <Bot className="w-6 h-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-sidebar-foreground">TG Userbot</h1>
            <p className="text-sm text-muted-foreground">Менеджер автоответов</p>
          </div>
        </div>
        
        {/* Theme toggle */}
        <button
          onClick={() => setDarkMode(!darkMode)}
          className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-accent transition-colors text-sm text-sidebar-foreground"
        >
          <span>Тема оформления</span>
          <div className="flex items-center space-x-2">
            <span className="text-xs text-muted-foreground">
              {darkMode ? 'Темная' : 'Светлая'}
            </span>
            {darkMode ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
          </div>
        </button>
      </div>
      
      {/* Navigation items */}
      <nav className="p-4">
        <ul className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            
            return (
              <li key={item.path}>
                <Link
                  to={item.path}
                  className={cn(
                    "flex items-center space-x-3 p-3 rounded-xl transition-all duration-200 group",
                    isActive
                      ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm"
                      : "text-sidebar-foreground hover:bg-accent hover:text-accent-foreground"
                  )}
                >
                  <Icon className={cn(
                    "w-5 h-5 transition-colors",
                    isActive 
                      ? "text-sidebar-accent-foreground" 
                      : "text-muted-foreground group-hover:text-accent-foreground"
                  )} />
                  <div className="flex-1">
                    <div className="font-medium">{item.label}</div>
                    <div className={cn(
                      "text-xs transition-colors",
                      isActive 
                        ? "text-sidebar-accent-foreground/70" 
                        : "text-muted-foreground group-hover:text-accent-foreground/70"
                    )}>
                      {item.description}
                    </div>
                  </div>
                  {isActive && (
                    <div className="w-1.5 h-1.5 bg-sidebar-accent-foreground rounded-full" />
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      
      {/* Footer */}
      <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-border">
        <div className="text-xs text-muted-foreground text-center">
          <div>Telegram Userbot Manager</div>
          <div className="mt-1">v1.0.0</div>
        </div>
      </div>
    </aside>
  );
};

// Main layout component
const Layout = ({ children, darkMode, setDarkMode }) => {
  return (
    <div className="min-h-screen bg-background transition-colors duration-200">
      <Navigation darkMode={darkMode} setDarkMode={setDarkMode} />
      <main className="ml-72 min-h-screen">
        <div className="p-6">
          {children}
        </div>
      </main>
    </div>
  );
};

function App() {
  return (
    <ThemeProvider>
      {({ darkMode, setDarkMode }) => (
        <div className="App">
          <BrowserRouter>
            <Layout darkMode={darkMode} setDarkMode={setDarkMode}>
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/accounts" element={<Accounts />} />
                <Route path="/rules" element={<Rules />} />
                <Route path="/images" element={<Images />} />
                <Route path="/logs" element={<Logs />} />
                <Route path="/settings" element={<Settings />} />
              </Routes>
            </Layout>
          </BrowserRouter>
        </div>
      )}
    </ThemeProvider>
  );
}

export default App;