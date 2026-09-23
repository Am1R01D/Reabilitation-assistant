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
import { GeminiAnalysisCard } from '@/components/GeminiAnalysisCard';
import { GeminiChat } from '@/components/GeminiChat';

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
        setError(loadError instanceof Error ? loadError.message : 'Unable to load dashboard data.');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-pulse text-clinical-500">Loading dashboard...</div>
      </div>
    );
  }

  if (error || !data) {
    return <DataError message={error || 'Dashboard data is unavailable.'} />;
  }

  const latestCheckIn = data.checkIns[data.checkIns.length - 1];
  const latestSession = data.sessions[0];
  const weeklyPct = Math.round(
    (data.gamification.weekly_completed / data.gamification.weekly_goal) * 100
  );

  return (
    <div className="space-y-6 page-enter">
      <div className="rounded-3xl bg-medical-800 text-white p-6 sm:p-8 relative overflow-hidden shadow-[0_18px_45px_rgba(28,76,72,0.22)]">
        <div className="absolute -right-12 -top-16 w-52 h-52 rounded-full bg-medical-500/35 blur-2xl" />
        <div className="relative">
          <p className="text-medical-200 text-sm font-medium mb-2">YOUR RECOVERY SPACE</p>
          <h1 className="text-3xl font-bold tracking-tight">Welcome back</h1>
          <p className="text-medical-100 mt-2">{data.condition}</p>
        </div>
      </div>

      <SafetyBanner />

      {!data.todayCheckIn && (
        <div className="card p-4 bg-medical-50 border-medical-200 flex items-center justify-between animate-[page-enter_500ms_ease-out]">
          <div className="flex items-center gap-3">
            <CalendarCheck className="w-5 h-5 text-medical-600" />
            <p className="text-sm font-medium text-medical-900">
              You haven&apos;t completed today&apos;s check-in yet
            </p>
          </div>
          <Link href="/patient/check-in" className="btn-primary text-sm py-1.5 px-3 flex items-center gap-1">
            Check in <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Pain Level"
          value={latestCheckIn ? `${latestCheckIn.pain}/10` : '0/10'}
          subtitle={latestCheckIn ? 'Latest check-in' : 'No check-ins yet'}
          icon={Heart}
          trend={latestCheckIn && latestCheckIn.pain <= 4 ? 'up' : 'down'}
        />
        <StatCard
          title="Mobility"
          value={latestCheckIn ? `${latestCheckIn.mobility}/10` : '0/10'}
          subtitle={latestCheckIn ? 'Latest check-in' : 'No check-ins yet'}
          icon={TrendingUp}
          trend={latestCheckIn && latestCheckIn.mobility >= 6 ? 'up' : 'neutral'}
        />
        <StatCard
          title="Recovery Streak"
          value={`${data.gamification.recovery_streak} days`}
          subtitle={`Exercise streak: ${data.gamification.exercise_streak} days`}
          icon={Flame}
        />
        <StatCard
          title="Weekly Goal"
          value={`${weeklyPct}%`}
          subtitle={`${data.gamification.weekly_completed}/${data.gamification.weekly_goal} sessions`}
          icon={Target}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-5 card-interactive">
          <h3 className="font-semibold text-clinical-900 mb-4">Today&apos;s Plan</h3>
          <div className="space-y-3">
            <Link
              href="/patient/check-in"
              className="flex items-center justify-between p-3 rounded-lg border border-clinical-200 hover:bg-clinical-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <CalendarCheck className={`w-5 h-5 ${data.todayCheckIn ? 'text-emerald-500' : 'text-clinical-400'}`} />
                <div>
                  <p className="font-medium text-sm">Daily Check-in</p>
                  <p className="text-xs text-clinical-500">
                    {data.todayCheckIn ? 'Completed' : 'Pending'}
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
                  <p className="font-medium text-sm">Bicep Curl Exercise</p>
                  <p className="text-xs text-clinical-500">
                    {latestSession
                      ? `Last: ${latestSession.reps} reps, ${Math.round(latestSession.form_score)}% form`
                      : 'Not started today'}
                  </p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-clinical-400" />
            </Link>
          </div>
        </div>

        <GeminiAnalysisCard showRefresh />
      </div>

      {latestCheckIn && (
        <div className="card p-5">
          <h3 className="font-semibold text-clinical-900">Latest Daily Check-in</h3>
          <p className="text-xs text-clinical-500 mt-1">Recorded {latestCheckIn.date}</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 text-sm">
            <CheckInDetail label="Swelling" value={latestCheckIn.swelling} />
            <CheckInDetail label="Fatigue" value={`${latestCheckIn.fatigue}/10`} />
            <CheckInDetail label="Sleep quality" value={`${latestCheckIn.sleep_quality}/10`} />
            <CheckInDetail label="Exercises" value={latestCheckIn.exercises_completed ? 'Completed' : 'Not completed'} />
          </div>
        </div>
      )}

      <GeminiChat />
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
  return (
    <div className="card max-w-xl mx-auto p-6 text-center">
      <h1 className="text-lg font-semibold text-clinical-900">Dashboard could not be loaded</h1>
      <p className="mt-2 text-sm text-clinical-600">{message}</p>
      <button onClick={() => window.location.reload()} className="btn-primary mt-4">Try again</button>
    </div>
  );
}
