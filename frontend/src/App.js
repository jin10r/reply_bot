import React from "react";
import "./App.css";
import { BrowserRouter, Routes, Route, Link, useLocation } from "react-router-dom";
import Dashboard from "./components/Dashboard";
import Accounts from "./components/Accounts";
import Rules from "./components/Rules";
import Images from "./components/Images";
import Logs from "./components/Logs";
import Settings from "./components/Settings";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

// Navigation component
const Navigation = () => {
  const location = useLocation();
  
  const navItems = [
    { path: "/", label: "Dashboard", icon: "🏠" },
    { path: "/accounts", label: "Аккаунты", icon: "👥" },
    { path: "/rules", label: "Правила", icon: "⚡" },
    { path: "/images", label: "Картинки", icon: "🖼️" },
    { path: "/logs", label: "Логи", icon: "📋" },
    { path: "/settings", label: "Настройки", icon: "⚙️" }
  ];

  return (
    <nav className="bg-gray-900 text-white w-64 min-h-screen p-4">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-blue-400">TG Userbot</h1>
        <p className="text-gray-400 text-sm">Менеджер автоответов</p>
      </div>
      
      <ul className="space-y-2">
        {navItems.map((item) => (
          <li key={item.path}>
            <Link
              to={item.path}
              className={`flex items-center space-x-3 p-3 rounded-lg transition-colors ${
                location.pathname === item.path
                  ? "bg-blue-600 text-white"
                  : "text-gray-300 hover:bg-gray-800"
              }`}
            >
              <span className="text-xl">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
};

// Main layout component
const Layout = ({ children }) => {
  return (
    <div className="flex min-h-screen bg-gray-100">
      <Navigation />
      <main className="flex-1 p-6">
        {children}
      </main>
    </div>
  );
};

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <Layout>
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
  );
}

export default App;