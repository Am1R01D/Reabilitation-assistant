'use client';

import { useState } from 'react';
import { Brain, Loader2, RefreshCw } from 'lucide-react';
import type { GeminiRecoveryAnalysis } from '@/lib/types';
import { useLanguage } from './LanguageProvider';

interface GeminiAnalysisCardProps {
  initialAnalysis?: (GeminiRecoveryAnalysis & { createdAt?: string }) | null;
  patientId?: number;
  showRefresh?: boolean;
}

export function GeminiAnalysisCard({
  initialAnalysis,
  patientId,
  showRefresh = true,
}: GeminiAnalysisCardProps) {
  const [analysis, setAnalysis] = useState(initialAnalysis);
  const [loading, setLoading] = useState(false);
  const { text, language } = useLanguage();

  async function runAnalysis() {
    setLoading(true);
    try {
      const res = await fetch('/api/gemini/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patientId, language }),
      });
      const data = await res.json();
      if (data.analysis) {
        setAnalysis({ ...data.analysis, createdAt: new Date().toISOString() });
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Brain className="w-5 h-5 text-medical-600" />
          <h3 className="font-semibold text-clinical-900">{text('AI Recovery Analysis', 'AI-анализ восстановления')}</h3>
        </div>
        {showRefresh && (
          <button
            onClick={runAnalysis}
            disabled={loading}
            className="btn-secondary text-sm flex items-center gap-1.5 py-1.5 px-3"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
            {analysis ? text('Refresh', 'Обновить') : text('Generate', 'Создать')}
          </button>
        )}
      </div>

      <p className="text-xs text-clinical-500 mb-4">
        {text('AI monitoring insights — not medical advice. Your doctor makes all treatment decisions.', 'AI помогает анализировать данные, но не даёт медицинских рекомендаций. Решения принимает врач.')}
      </p>

      {!analysis ? (
        <div className="text-center py-8 text-clinical-500">
          <Brain className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">{text('Generate an analysis based on your recovery data', 'Создайте анализ на основе данных восстановления')}</p>
        </div>
      ) : (
        <div className="space-y-4">
          <div>
            <p className="text-sm text-clinical-700 leading-relaxed">{analysis.summary}</p>
          </div>

          {analysis.positiveTrends.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-emerald-700 uppercase tracking-wide mb-2">
                {text('Positive Trends', 'Положительная динамика')}
              </h4>
              <ul className="space-y-1">
                {analysis.positiveTrends.map((t, i) => (
                  <li key={i} className="text-sm text-clinical-700 flex gap-2">
                    <span className="text-emerald-500">+</span> {t}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {analysis.concerningChanges.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-2">
                {text('Changes Warranting Review', 'Изменения для внимания врача')}
              </h4>
              <ul className="space-y-1">
                {analysis.concerningChanges.map((c, i) => (
                  <li key={i} className="text-sm text-clinical-700 flex gap-2">
                    <span className="text-amber-500">!</span> {c}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div>
            <h4 className="text-xs font-semibold text-clinical-500 uppercase tracking-wide mb-1">
              {text('Adherence', 'Соблюдение плана')}
            </h4>
            <p className="text-sm text-clinical-700">{analysis.adherenceSummary}</p>
          </div>

          {analysis.clinicianReviewPoints.length > 0 && (
            <div className="bg-clinical-50 rounded-lg p-3">
              <h4 className="text-xs font-semibold text-clinical-600 uppercase tracking-wide mb-2">
                {text('Points for Clinician Review', 'Для обсуждения с врачом')}
              </h4>
              <ul className="space-y-1">
                {analysis.clinicianReviewPoints.map((p, i) => (
                  <li key={i} className="text-sm text-clinical-700">• {p}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
