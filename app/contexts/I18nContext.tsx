"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

export type AppLanguage = 'en' | 'ru';

type TranslationValue = string;
type TranslationDict = Record<string, TranslationValue>;

const translations: Record<AppLanguage, TranslationDict> = {
  en: {
    'home.bio': 'Dmitrii Gareev is a Product Designer at Yandex Infrastructure. I work at the intersection of product design and AI, helping shape internal tools for developers. My focus is on making complex systems feel simple — designing scalable, intuitive interfaces that adapt to how people actually work.',
    'home.social.x': 'X.com',
    'home.social.telegram': 'Telegram',
    'home.social.linkedin': 'LinkedIn',
    'profile.appearance': 'Appearance',
    'profile.appearance.language': 'Language',
    'profile.language.en': 'English',
    'profile.language.ru': 'Russian',
  },
  ru: {
    'home.bio': 'Дмитрий Гареев — продуктовый дизайнер в Yandex Infrastructure. Я работаю на пересечении продуктового дизайна и AI, помогая создавать внутренние инструменты для разработчиков. Мой фокус — делать сложные системы простыми: проектировать масштабируемые и интуитивные интерфейсы, которые подстраиваются под реальные рабочие процессы людей.',
    'home.social.x': 'X.com',
    'home.social.telegram': 'Telegram',
    'home.social.linkedin': 'LinkedIn',
    'profile.appearance': 'Внешний вид',
    'profile.appearance.language': 'Язык',
    'profile.language.en': 'English',
    'profile.language.ru': 'Русский',
  },
};

interface I18nContextValue {
  language: AppLanguage;
  setLanguage: (language: AppLanguage) => void;
  t: (key: string) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

const STORAGE_KEY = 'app-language';

export const I18nProvider = ({ children }: { children: React.ReactNode }) => {
  const [language, setLanguageState] = useState<AppLanguage>('en');

  useEffect(() => {
    const savedLanguage = localStorage.getItem(STORAGE_KEY);

    if (savedLanguage === 'en' || savedLanguage === 'ru') {
      setLanguageState(savedLanguage);
      document.documentElement.lang = savedLanguage;
      return;
    }

    const browserLanguage = navigator.language.toLowerCase();
    const detectedLanguage: AppLanguage = browserLanguage.startsWith('ru') ? 'ru' : 'en';
    setLanguageState(detectedLanguage);
    document.documentElement.lang = detectedLanguage;
  }, []);

  useEffect(() => {
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY && (event.newValue === 'en' || event.newValue === 'ru')) {
        setLanguageState(event.newValue);
        document.documentElement.lang = event.newValue;
      }
    };

    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  const setLanguage = useCallback((nextLanguage: AppLanguage) => {
    setLanguageState(nextLanguage);
    localStorage.setItem(STORAGE_KEY, nextLanguage);
    document.documentElement.lang = nextLanguage;
  }, []);

  const t = useCallback(
    (key: string) => {
      return translations[language][key] ?? translations.en[key] ?? key;
    },
    [language]
  );

  const value = useMemo(
    () => ({
      language,
      setLanguage,
      t,
    }),
    [language, setLanguage, t]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
};

export const useI18n = () => {
  const context = useContext(I18nContext);

  if (!context) {
    throw new Error('useI18n must be used within I18nProvider');
  }

  return context;
};
