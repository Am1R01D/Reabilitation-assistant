'use client';

import { Languages } from 'lucide-react';
import { useLanguage } from './LanguageProvider';

export function LanguageSwitcher({ compact = false }: { compact?: boolean }) {
  const { language, setLanguage } = useLanguage();
  return (
    <label className={`flex items-center gap-1.5 rounded-xl border border-clinical-200 bg-white/90 ${compact ? 'px-2 py-1' : 'px-2.5 py-1.5'} shadow-sm`}>
      <Languages className="h-4 w-4 text-medical-600" />
      <select
        aria-label="Language"
        value={language}
        onChange={(event) => setLanguage(event.target.value as 'en' | 'ru')}
        className="bg-transparent text-xs font-medium text-clinical-700 outline-none"
      >
        <option value="ru">Русский</option>
        <option value="en">English</option>
      </select>
    </label>
  );
}
