import { createContext, useContext, useState, useEffect } from 'react';
import ru from './ru';
import en from './en';

const translations = {
  ru,
  en
};

const LanguageContext = createContext();

export const LanguageProvider = ({ children }) => {
  const [currentLanguage, setCurrentLanguage] = useState(() => {
    const saved = localStorage.getItem('telegram-bot-language');
    return saved || 'ru';
  });

  useEffect(() => {
    localStorage.setItem('telegram-bot-language', currentLanguage);
  }, [currentLanguage]);

  const t = (key, params = {}) => {
    const keys = key.split('.');
    let value = translations[currentLanguage];
    
    for (const k of keys) {
      value = value?.[k];
    }
    
    if (!value) {
      // Fallback to Russian if translation not found
      value = translations['ru'];
      for (const k of keys) {
        value = value?.[k];
      }
    }
    
    if (!value) return key;
    
    // Replace parameters in translation
    return Object.keys(params).reduce((str, param) => {
      return str.replace(`{${param}}`, params[param]);
    }, value);
  };

  const changeLanguage = (lang) => {
    if (translations[lang]) {
      setCurrentLanguage(lang);
    }
  };

  return (
    <LanguageContext.Provider value={{ 
      t, 
      currentLanguage, 
      changeLanguage,
      availableLanguages: Object.keys(translations)
    }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useTranslation = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useTranslation must be used within a LanguageProvider');
  }
  return context;
};