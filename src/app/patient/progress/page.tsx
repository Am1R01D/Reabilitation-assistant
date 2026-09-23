'use client';

import { useEffect, useState } from 'react';
import { Flame, Target, TrendingUp, Award } from 'lucide-react';
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
      exercises_completed: number;
    }>;
    sessions: Array<{ created_at: string; range_of_motion: number; form_score: number; reps: number }>;
    gamification: { recovery_streak: number; exercise_streak: number; weekly_goal: number; weekly_completed: number };
    complianceRate: number;
  } | null>(null);
  const [error, setError] = useState('');
  const { text } = useLanguage();

  useEffect(() => {
    fetch('/api/progress', { cache: 'no-store' })
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok) throw new Error(body.error || 'Unable to load progress data.');
        return body;
      })
      .then(setData)
      .catch((loadError) => setError(loadError instanceof Error ? loadError.message : 'Unable to load progress data.'));
  }, []);

  if (!data && !error) {
    return <div className="text-center py-20 text-clinical-500 animate-pulse">Loading progress...</div>;
  }

  if (error || !data) {
    return (
      <div className="card max-w-xl mx-auto p-6 text-center">
        <h1 className="text-lg font-semibold text-clinical-900">Progress could not be loaded</h1>
        <p className="mt-2 text-sm text-clinical-600">{error}</p>
        <button onClick={() => window.location.reload()} className="btn-primary mt-4">Try again</button>
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

  return (
    <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
      <div className="min-w-0 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-clinical-900">{text('Your Progress', 'Ваш прогресс')}</h1>
        <p className="text-clinical-500 mt-1">{text('Track your recovery journey', 'Следите за процессом восстановления')}</p>
      </div>

      <SafetyBanner />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title={text('Compliance', 'Выполнение плана')}
          value={`${Math.round(data.complianceRate)}%`}
          subtitle="Exercise check-ins"
          icon={Target}
        />
        <StatCard
          title={text('Total Reps', 'Всего повторений')}
          value={totalReps}
          subtitle={`${data.sessions.length} sessions`}
          icon={TrendingUp}
        />
        <StatCard
          title={text('Avg Form Score', 'Средняя техника')}
          value={`${avgForm}%`}
          subtitle={`ROM: ${avgRom}°`}
          icon={Award}
        />
        <StatCard
          title={text('Recovery Streak', 'Серия восстановления')}
          value={`${data.gamification.recovery_streak}d`}
          subtitle={`Exercise: ${data.gamification.exercise_streak}d`}
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
