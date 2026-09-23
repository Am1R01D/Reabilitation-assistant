'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  CalendarCheck,
  Dumbbell,
  Flame,
  Heart,
  Target,
  TrendingUp,
  ArrowRight,
} from 'lucide-react';
import { StatCard } from '@/components/StatCard';
import { SafetyBanner } from '@/components/SafetyBanner';
import { GeminiChat } from '@/components/GeminiChat';
import { AIErrorBoundary } from '@/components/AIErrorBoundary';
import { useLanguage } from '@/components/LanguageProvider';

interface DashboardData {
  checkIns: Array<{
    pain: number;
    mobility: number;
    fatigue: number;
    sleep_quality: number;
    swelling: 'none' | 'mild' | 'severe';
    date: string;
    exercises_completed: number;
  }>;
  todayCheckIn: unknown;
  gamification: {
    recovery_streak: number;
    exercise_streak: number;
    weekly_goal: number;
    weekly_completed: number;
  };
  complianceRate: number;
  condition: string;
  sessions: Array<{ reps: number; form_score: number; created_at: string }>;
}

export default function PatientDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { text, language } = useLanguage();

  useEffect(() => {
    async function load() {
      try {
        const [progressRes, checkInRes] = await Promise.all([
          fetch('/api/progress', { cache: 'no-store' }),
          fetch('/api/check-in', { cache: 'no-store' }),
        ]);
        const progress = await progressRes.json();
        const checkIn = await checkInRes.json();
        if (!progressRes.ok || !checkInRes.ok) {
          throw new Error(progress.error || checkIn.error || 'Unable to load dashboard data.');
        }
        setData({ ...progress, todayCheckIn: checkIn.todayCheckIn });
      } catch (loadError) {
        setError(language === 'ru' ? 'Не удалось загрузить данные главной страницы.' : (loadError instanceof Error ? loadError.message : 'Unable to load dashboard data.'));
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [language]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-pulse text-clinical-500">{text('Loading dashboard...', 'Загрузка главной страницы...')}</div>
      </div>
    );
  }

  if (error || !data) {
    return <DataError message={error || text('Dashboard data is unavailable.', 'Данные главной страницы недоступны.')} />;
  }

  const latestCheckIn = data.checkIns[data.checkIns.length - 1];
  const latestSession = data.sessions[0];
  const weeklyPct = Math.round(
    (data.gamification.weekly_completed / data.gamification.weekly_goal) * 100
  );

  return (
    <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_360px] page-enter">
      <div className="min-w-0 space-y-6">
      <div className="rounded-3xl bg-medical-800 text-white p-6 sm:p-8 relative overflow-hidden shadow-[0_18px_45px_rgba(28,76,72,0.22)]">
        <div className="absolute -right-12 -top-16 w-52 h-52 rounded-full bg-medical-500/35 blur-2xl" />
        <div className="relative">
          <p className="text-medical-200 text-sm font-medium mb-2">{text('YOUR RECOVERY SPACE', 'ВАШЕ ВОССТАНОВЛЕНИЕ')}</p>
          <h1 className="text-3xl font-bold tracking-tight">{text('Welcome back', 'С возвращением')}</h1>
          <p className="text-medical-100 mt-2">{language === 'ru' ? data.condition.replace('Broken arm', 'Перелом руки').replace('Broken leg', 'Перелом ноги').replace('cast still on', 'гипс ещё не снят').replace('cast removed', 'гипс снят') : data.condition}</p>
        </div>
      </div>

      <SafetyBanner />

      {!data.todayCheckIn && (
        <div className="card p-4 bg-medical-50 border-medical-200 flex items-center justify-between animate-[page-enter_500ms_ease-out]">
          <div className="flex items-center gap-3">
            <CalendarCheck className="w-5 h-5 text-medical-600" />
            <p className="text-sm font-medium text-medical-900">
              {text("You haven't completed today's check-in yet", 'Вы ещё не заполнили сегодняшний чек-ин')}
            </p>
          </div>
          <Link href="/patient/check-in" className="btn-primary text-sm py-1.5 px-3 flex items-center gap-1">
            {text('Check in', 'Заполнить')} <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title={text('Pain Level', 'Уровень боли')}
          value={latestCheckIn ? `${latestCheckIn.pain}/10` : '0/10'}
          subtitle={latestCheckIn ? text('Latest check-in', 'Последний чек-ин') : text('No check-ins yet', 'Чек-инов пока нет')}
          icon={Heart}
          trend={latestCheckIn && latestCheckIn.pain <= 4 ? 'up' : 'down'}
        />
        <StatCard
          title={text('Mobility', 'Подвижность')}
          value={latestCheckIn ? `${latestCheckIn.mobility}/10` : '0/10'}
          subtitle={latestCheckIn ? text('Latest check-in', 'Последний чек-ин') : text('No check-ins yet', 'Чек-инов пока нет')}
          icon={TrendingUp}
          trend={latestCheckIn && latestCheckIn.mobility >= 6 ? 'up' : 'neutral'}
        />
        <StatCard
          title={text('Recovery Streak', 'Серия восстановления')}
          value={`${data.gamification.recovery_streak} ${text('days', 'дн.')}`}
          subtitle={`${text('Exercise streak', 'Серия упражнений')}: ${data.gamification.exercise_streak} ${text('days', 'дн.')}`}
          icon={Flame}
        />
        <StatCard
          title={text('Weekly Goal', 'Недельная цель')}
          value={`${weeklyPct}%`}
          subtitle={`${data.gamification.weekly_completed}/${data.gamification.weekly_goal} ${text('sessions', 'тренировок')}`}
          icon={Target}
        />
      </div>

      <div className="grid grid-cols-1 gap-6">
        <div className="card p-5 card-interactive">
          <h3 className="font-semibold text-clinical-900 mb-4">{text("Today's Plan", 'План на сегодня')}</h3>
          <div className="space-y-3">
            <Link
              href="/patient/check-in"
              className="flex items-center justify-between p-3 rounded-lg border border-clinical-200 hover:bg-clinical-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <CalendarCheck className={`w-5 h-5 ${data.todayCheckIn ? 'text-emerald-500' : 'text-clinical-400'}`} />
                <div>
                  <p className="font-medium text-sm">{text('Daily Check-in', 'Ежедневный чек-ин')}</p>
                  <p className="text-xs text-clinical-500">
                    {data.todayCheckIn ? text('Completed', 'Выполнено') : text('Pending', 'Ожидается')}
                  </p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-clinical-400" />
            </Link>
            <Link
              href="/patient/exercises"
              className="flex items-center justify-between p-3 rounded-lg border border-clinical-200 hover:bg-clinical-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Dumbbell className="w-5 h-5 text-medical-600" />
                <div>
                  <p className="font-medium text-sm">{text('Rehabilitation Exercises', 'Реабилитационные упражнения')}</p>
                  <p className="text-xs text-clinical-500">
                    {latestSession
                      ? text(`Last: ${latestSession.reps} reps, ${Math.round(latestSession.form_score)}% form`, `Последняя: ${latestSession.reps} повт., техника ${Math.round(latestSession.form_score)}%`)
                      : text('Not started today', 'Сегодня ещё не выполнялись')}
                  </p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-clinical-400" />
            </Link>
          </div>
        </div>
      </div>

      {latestCheckIn && (
        <div className="card p-5">
          <h3 className="font-semibold text-clinical-900">{text('Latest Daily Check-in', 'Последний ежедневный чек-ин')}</h3>
          <p className="text-xs text-clinical-500 mt-1">{text('Recorded', 'Записано')}: {latestCheckIn.date}</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 text-sm">
            <CheckInDetail label={text('Swelling', 'Отёк')} value={text(latestCheckIn.swelling, latestCheckIn.swelling === 'none' ? 'нет' : latestCheckIn.swelling === 'mild' ? 'лёгкий' : 'сильный')} />
            <CheckInDetail label={text('Fatigue', 'Усталость')} value={`${latestCheckIn.fatigue}/10`} />
            <CheckInDetail label={text('Sleep quality', 'Качество сна')} value={`${latestCheckIn.sleep_quality}/10`} />
            <CheckInDetail label={text('Exercises', 'Упражнения')} value={latestCheckIn.exercises_completed ? text('Completed', 'Выполнены') : text('Not completed', 'Не выполнены')} />
          </div>
        </div>
      )}

      </div>

      <aside className="xl:sticky xl:top-6">
        <AIErrorBoundary>
          <GeminiChat />
        </AIErrorBoundary>
      </aside>
    </div>
  );
}

function CheckInDetail({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-clinical-50 p-3">
      <p className="text-xs text-clinical-500">{label}</p>
      <p className="mt-1 font-medium capitalize text-clinical-900">{value}</p>
    </div>
  );
}

function DataError({ message }: { message: string }) {
  const { text } = useLanguage();
  return (
    <div className="card max-w-xl mx-auto p-6 text-center">
      <h1 className="text-lg font-semibold text-clinical-900">{text('Dashboard could not be loaded', 'Не удалось загрузить главную страницу')}</h1>
      <p className="mt-2 text-sm text-clinical-600">{message}</p>
      <button onClick={() => window.location.reload()} className="btn-primary mt-4">{text('Try again', 'Повторить')}</button>
    </div>
  );
}
