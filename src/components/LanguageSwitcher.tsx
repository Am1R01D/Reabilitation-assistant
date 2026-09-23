'use client';

import { Languages } from 'lucide-react';
import { useLanguage } from './LanguageProvider';

export function LanguageSwitcher({ compact = false }: { compact?: boolean }) {
  const { language, setLanguage, text } = useLanguage();
  return (
    <div className={`flex items-center gap-1 rounded-xl border border-clinical-200 bg-white/95 ${compact ? 'p-1' : 'p-1.5'} shadow-sm`} aria-label={text('Language', 'Язык')} role="group">
      <Languages className={`text-medical-600 ${compact ? 'mx-1 h-4 w-4' : 'mx-1.5 h-4 w-4'}`} />
      {(['ru', 'en'] as const).map((option) => (
        <button
          key={option}
          type="button"
          onClick={() => setLanguage(option)}
          aria-pressed={language === option}
          className={`${compact ? 'px-2 py-1 text-[11px]' : 'px-3 py-1.5 text-xs'} rounded-lg font-semibold transition-all ${
            language === option
              ? 'bg-medical-600 text-white shadow-sm'
              : 'text-clinical-500 hover:bg-clinical-100 hover:text-clinical-800'
          }`}
        >
          {option === 'ru' ? 'RU' : 'EN'}
        </button>
      ))}
    </div>
  );
}
