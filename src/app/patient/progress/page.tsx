'use client';

import { useEffect, useState } from 'react';
import { Flame, Target, TrendingUp, Award, Download } from 'lucide-react';
import { ProgressCharts } from '@/components/ProgressCharts';
import { StatCard } from '@/components/StatCard';
import { GeminiAnalysisCard } from '@/components/GeminiAnalysisCard';
import { SafetyBanner } from '@/components/SafetyBanner';
import { GeminiChat } from '@/components/GeminiChat';
import { AIErrorBoundary } from '@/components/AIErrorBoundary';
import { useLanguage } from '@/components/LanguageProvider';

export default function ProgressPage() {
  const [data, setData] = useState<{
    checkIns: Array<{
      date: string;
      pain: number;
      mobility: number;
      fatigue: number;
      sleep_quality: number;
      swelling?: string;
      exercises_completed: number;
    }>;
    sessions: Array<{ created_at: string; range_of_motion: number; form_score: number; reps: number; exercise_type?: string; duration?: number }>;
    gamification: { recovery_streak: number; exercise_streak: number; weekly_goal: number; weekly_completed: number };
    complianceRate: number;
    patientName: string;
    condition: string;
    startDate: string;
  } | null>(null);
  const [error, setError] = useState('');
  const { text, language } = useLanguage();

  useEffect(() => {
    fetch('/api/progress', { cache: 'no-store' })
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok) throw new Error(body.error || 'Unable to load progress data.');
        return body;
      })
      .then(setData)
      .catch((loadError) => setError(language === 'ru' ? 'Не удалось загрузить данные прогресса.' : (loadError instanceof Error ? loadError.message : 'Unable to load progress data.')));
  }, [language]);

  if (!data && !error) {
    return <div className="text-center py-20 text-clinical-500 animate-pulse">{text('Loading progress...', 'Загрузка прогресса...')}</div>;
  }

  if (error || !data) {
    return (
      <div className="card max-w-xl mx-auto p-6 text-center">
        <h1 className="text-lg font-semibold text-clinical-900">{text('Progress could not be loaded', 'Не удалось загрузить прогресс')}</h1>
        <p className="mt-2 text-sm text-clinical-600">{error}</p>
        <button onClick={() => window.location.reload()} className="btn-primary mt-4">{text('Try again', 'Повторить')}</button>
      </div>
    );
  }

  const totalReps = data.sessions.reduce((s, x) => s + x.reps, 0);
  const avgForm =
    data.sessions.length > 0
      ? Math.round(data.sessions.reduce((s, x) => s + x.form_score, 0) / data.sessions.length)
      : 0;
  const avgRom =
    data.sessions.length > 0
      ? Math.round(data.sessions.reduce((s, x) => s + x.range_of_motion, 0) / data.sessions.length)
      : 0;

  function downloadProgress() {
    if (!data) return;
    const isRussian = language === 'ru';
    const condition = isRussian
      ? data.condition.replace('Broken arm', 'Перелом руки').replace('Broken leg', 'Перелом ноги').replace('cast still on', 'гипс ещё не снят').replace('cast removed', 'гипс снят')
      : data.condition;
    const exerciseNames: Record<string, string> = isRussian
      ? { finger_flexion: 'Сгибание пальцев', bicep_curl: 'Сгибание руки', ankle_pumps: 'Движения стопой', straight_leg_raise: 'Подъём прямой ноги' }
      : { finger_flexion: 'Finger Flexion', bicep_curl: 'Bicep Curl', ankle_pumps: 'Ankle Movements', straight_leg_raise: 'Straight Leg Raise' };
    const rows: Array<Array<string | number>> = [
      [isRussian ? 'Отчёт о восстановлении Re.assist' : 'Re.assist Recovery Report'],
      [],
      [isRussian ? 'Пациент' : 'Patient', data.patientName],
      [isRussian ? 'Травма' : 'Condition', condition],
      [isRussian ? 'Начало восстановления' : 'Recovery started', data.startDate],
      [isRussian ? 'Дата отчёта' : 'Report date', new Date().toLocaleDateString(isRussian ? 'ru-RU' : 'en-US')],
      [],
      [isRussian ? 'Сводка' : 'Summary'],
      [isRussian ? 'Выполнение плана' : 'Compliance', `${Math.round(data.complianceRate)}%`],
      [isRussian ? 'Всего повторений' : 'Total repetitions', totalReps],
      [isRussian ? 'Средняя техника' : 'Average form score', `${avgForm}%`],
      [isRussian ? 'Средняя амплитуда' : 'Average range of motion', `${avgRom}°`],
      [],
      [isRussian ? 'Чек-ины' : 'Check-ins'],
      [isRussian ? 'Дата' : 'Date', isRussian ? 'Боль (0–10)' : 'Pain (0–10)', isRussian ? 'Подвижность (0–10)' : 'Mobility (0–10)', isRussian ? 'Усталость (0–10)' : 'Fatigue (0–10)', isRussian ? 'Сон (0–10)' : 'Sleep (0–10)', isRussian ? 'Отёк' : 'Swelling', isRussian ? 'Упражнения выполнены' : 'Exercises completed'],
      ...data.checkIns.map((item) => [item.date, item.pain, item.mobility, item.fatigue, item.sleep_quality, item.swelling || '—', item.exercises_completed ? (isRussian ? 'Да' : 'Yes') : (isRussian ? 'Нет' : 'No')]),
      [],
      [isRussian ? 'Тренировки' : 'Exercise sessions'],
      [isRussian ? 'Дата' : 'Date', isRussian ? 'Упражнение' : 'Exercise', isRussian ? 'Повторения' : 'Repetitions', isRussian ? 'Техника' : 'Form score', isRussian ? 'Амплитуда' : 'Range of motion', isRussian ? 'Длительность, сек.' : 'Duration, sec.'],
      ...data.sessions.map((item) => [item.created_at.split('T')[0], exerciseNames[item.exercise_type || ''] || item.exercise_type || '—', item.reps, `${Math.round(item.form_score)}%`, `${Math.round(item.range_of_motion)}°`, item.duration || 0]),
    ];
    const csvCell = (value: string | number) => {
      let safeValue = String(value);
      if (/^[=+\-@]/.test(safeValue)) safeValue = `'${safeValue}`;
      return `"${safeValue.replace(/"/g, '""')}"`;
    };
    const csv = `\uFEFF${rows.map((row) => row.map(csvCell).join(';')).join('\r\n')}`;
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `reassist-progress-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
      <div className="min-w-0 space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-clinical-900">{text('Your Progress', 'Ваш прогресс')}</h1>
          <p className="text-clinical-500 mt-1">{text('Track your recovery journey', 'Следите за процессом восстановления')}</p>
        </div>
        <button type="button" onClick={downloadProgress} className="btn-secondary flex items-center gap-2 text-sm">
          <Download className="h-4 w-4" /> {text('Download report', 'Скачать отчёт')}
        </button>
      </div>

      <SafetyBanner />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title={text('Compliance', 'Выполнение плана')}
          value={`${Math.round(data.complianceRate)}%`}
          subtitle={text('Exercise check-ins', 'Чек-ины упражнений')}
          icon={Target}
        />
        <StatCard
          title={text('Total Reps', 'Всего повторений')}
          value={totalReps}
          subtitle={`${data.sessions.length} ${text('sessions', 'тренировок')}`}
          icon={TrendingUp}
        />
        <StatCard
          title={text('Avg Form Score', 'Средняя техника')}
          value={`${avgForm}%`}
          subtitle={`${text('Range', 'Диапазон')}: ${avgRom}°`}
          icon={Award}
        />
        <StatCard
          title={text('Recovery Streak', 'Серия восстановления')}
          value={text(`${data.gamification.recovery_streak}d`, `${data.gamification.recovery_streak} дн.`)}
          subtitle={`${text('Exercise', 'Упражнения')}: ${data.gamification.exercise_streak}${text('d', 'д')}`}
          icon={Flame}
        />
      </div>

      <ProgressCharts checkIns={data.checkIns} sessions={data.sessions} />

      <AIErrorBoundary>
        <GeminiAnalysisCard showRefresh />
      </AIErrorBoundary>
      </div>

      <aside className="xl:sticky xl:top-6">
        <AIErrorBoundary>
          <GeminiChat />
        </AIErrorBoundary>
      </aside>
    </div>
  );
}
