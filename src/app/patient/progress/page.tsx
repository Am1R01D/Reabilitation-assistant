'use client';

import { useEffect, useState } from 'react';
import { Flame, Target, TrendingUp, Award } from 'lucide-react';
import { ProgressCharts } from '@/components/ProgressCharts';
import { StatCard } from '@/components/StatCard';
import { GeminiAnalysisCard } from '@/components/GeminiAnalysisCard';
import { SafetyBanner } from '@/components/SafetyBanner';

export default function ProgressPage() {
  const [data, setData] = useState<{
    checkIns: Array<{ date: string; pain: number; mobility: number; exercises_completed: number }>;
    sessions: Array<{ created_at: string; range_of_motion: number; form_score: number; reps: number }>;
    gamification: { recovery_streak: number; exercise_streak: number; weekly_goal: number; weekly_completed: number };
    complianceRate: number;
  } | null>(null);

  useEffect(() => {
    fetch('/api/progress')
      .then((r) => r.json())
      .then(setData);
  }, []);

  if (!data) {
    return <div className="text-center py-20 text-clinical-500 animate-pulse">Loading progress...</div>;
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
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-clinical-900">Your Progress</h1>
        <p className="text-clinical-500 mt-1">Track your recovery journey</p>
      </div>

      <SafetyBanner />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Compliance"
          value={`${Math.round(data.complianceRate)}%`}
          subtitle="Exercise check-ins"
          icon={Target}
        />
        <StatCard
          title="Total Reps"
          value={totalReps}
          subtitle={`${data.sessions.length} sessions`}
          icon={TrendingUp}
        />
        <StatCard
          title="Avg Form Score"
          value={`${avgForm}%`}
          subtitle={`ROM: ${avgRom}°`}
          icon={Award}
        />
        <StatCard
          title="Recovery Streak"
          value={`${data.gamification.recovery_streak}d`}
          subtitle={`Exercise: ${data.gamification.exercise_streak}d`}
          icon={Flame}
        />
      </div>

      <ProgressCharts checkIns={data.checkIns} sessions={data.sessions} />

      <GeminiAnalysisCard showRefresh />
    </div>
  );
}
