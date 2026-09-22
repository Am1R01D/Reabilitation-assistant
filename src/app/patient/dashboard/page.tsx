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

interface DashboardData {
  checkIns: Array<{ pain: number; mobility: number; date: string; exercises_completed: number }>;
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

  useEffect(() => {
    async function load() {
      const [progressRes, checkInRes, sessionRes] = await Promise.all([
        fetch('/api/progress'),
        fetch('/api/check-in'),
        fetch('/api/exercises/session'),
      ]);
      const progress = await progressRes.json();
      const checkIn = await checkInRes.json();
      const sessions = await sessionRes.json();
      setData({ ...progress, ...checkIn, sessions: sessions.sessions });
      setLoading(false);
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

  if (!data) return null;

  const latestCheckIn = data.checkIns[data.checkIns.length - 1];
  const latestSession = data.sessions[0];
  const weeklyPct = Math.round(
    (data.gamification.weekly_completed / data.gamification.weekly_goal) * 100
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-clinical-900">Welcome back</h1>
        <p className="text-clinical-500 mt-1">{data.condition}</p>
      </div>

      <SafetyBanner />

      {!data.todayCheckIn && (
        <div className="card p-4 bg-medical-50 border-medical-200 flex items-center justify-between">
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
          value={latestCheckIn ? `${latestCheckIn.pain}/10` : '—'}
          subtitle={latestCheckIn ? 'Latest check-in' : 'No data'}
          icon={Heart}
          trend={latestCheckIn && latestCheckIn.pain <= 4 ? 'up' : 'down'}
        />
        <StatCard
          title="Mobility"
          value={latestCheckIn ? `${latestCheckIn.mobility}/10` : '—'}
          subtitle={latestCheckIn ? 'Latest check-in' : 'No data'}
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
        <div className="card p-5">
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
    </div>
  );
}
