'use client';

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

type Language = 'en' | 'ru';

interface LanguageContextValue {
  language: Language;
  setLanguage: (language: Language) => void;
  text: (english: string, russian: string) => string;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>('en');

  useEffect(() => {
    const saved = window.localStorage.getItem('reassist-language');
    if (saved === 'ru' || saved === 'en') setLanguageState(saved);
  }, []);

  function setLanguage(nextLanguage: Language) {
    setLanguageState(nextLanguage);
    window.localStorage.setItem('reassist-language', nextLanguage);
  }

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  const value = useMemo<LanguageContextValue>(() => ({
    language,
    setLanguage,
    text: (english, russian) => language === 'ru' ? russian : english,
  }), [language]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) throw new Error('useLanguage must be used inside LanguageProvider');
  return context;
}
