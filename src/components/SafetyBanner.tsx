'use client';

import { AlertTriangle, Info } from 'lucide-react';
import { useLanguage } from './LanguageProvider';

export function SafetyBanner({ variant = 'info' }: { variant?: 'info' | 'warning' }) {
  const { text } = useLanguage();
  if (variant === 'warning') {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex gap-3">
        <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div className="text-sm text-amber-900">
          <p className="font-semibold mb-1">{text('Symptoms require clinician review', 'Симптомы требуют внимания врача')}</p>
          <p>
            {text(
              'Your reported symptoms have been flagged for your doctor. The app does not change your treatment plan. If symptoms are urgent, contact your healthcare provider directly.',
              'Указанные симптомы отмечены для врача. Приложение не меняет план лечения. При срочных симптомах напрямую обратитесь к медицинскому специалисту.'
            )}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-medical-50 border border-medical-200 rounded-lg p-4 flex gap-3">
      <Info className="w-5 h-5 text-medical-600 shrink-0 mt-0.5" />
      <div className="text-sm text-medical-900">
        <p className="font-semibold mb-1">{text('Human-in-the-Loop Safety', 'Контроль медицинского специалиста')}</p>
        <p>
          {text(
            'Your doctor manages your rehabilitation plan. AI supports monitoring but does not diagnose, prescribe, or make medical decisions.',
            'Планом реабилитации управляет врач. ИИ помогает отслеживать данные, но не ставит диагноз и не принимает медицинские решения.'
          )}
        </p>
      </div>
    </div>
  );
}
