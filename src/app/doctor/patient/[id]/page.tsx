'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, AlertTriangle, Calendar, Dumbbell } from 'lucide-react';
import { ProgressCharts } from '@/components/ProgressCharts';
import { GeminiAnalysisCard } from '@/components/GeminiAnalysisCard';
import { SafetyBanner } from '@/components/SafetyBanner';
import { StatCard } from '@/components/StatCard';
import { Heart, TrendingUp, Target, Flame } from 'lucide-react';

interface PatientDetail {
  patient: {
    id: number;
    name: string;
    email: string;
    condition: string;
    start_date: string;
  };
  checkIns: Array<{
    id: number;
    date: string;
    pain: number;
    swelling: string;
    mobility: number;
    fatigue: number;
    sleep_quality: number;
    exercises_completed: number;
  }>;
  sessions: Array<{
    id: number;
    reps: number;
    form_score: number;
    range_of_motion: number;
    average_angle: number;
    duration: number;
    created_at: string;
  }>;
  alerts: Array<{
    id: number;
    type: string;
    message: string;
    severity: string;
    created_at: string;
  }>;
  gamification: {
    recovery_streak: number;
    exercise_streak: number;
    weekly_goal: number;
    weekly_completed: number;
  };
  analysis: {
    summary: string;
    positiveTrends: string[];
    concerningChanges: string[];
    adherenceSummary: string;
    clinicianReviewPoints: string[];
    createdAt?: string;
  } | null;
  complianceRate: number;
}

export default function PatientDetailPage() {
  const params = useParams();
  const [data, setData] = useState<PatientDetail | null>(null);

  useEffect(() => {
    fetch(`/api/doctor/patient/${params.id}`)
      .then((r) => r.json())
      .then(setData);
  }, [params.id]);

  if (!data) {
    return <div className="text-center py-20 text-clinical-500 animate-pulse">Loading patient details...</div>;
  }

  const latestCheckIn = data.checkIns[0];
  const severityColor = (s: string) =>
    s === 'high' ? 'bg-red-100 text-red-800' : s === 'medium' ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800';

  return (
    <div className="space-y-6">
      <Link href="/doctor/dashboard" className="inline-flex items-center gap-1 text-sm text-clinical-500 hover:text-clinical-700">
        <ArrowLeft className="w-4 h-4" /> Back to patients
      </Link>

      <div>
        <h1 className="text-2xl font-bold text-clinical-900">{data.patient.name}</h1>
        <p className="text-clinical-500 mt-1">
          {data.patient.condition} · Started {data.patient.start_date}
        </p>
      </div>

      <SafetyBanner />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Pain"
          value={latestCheckIn ? `${latestCheckIn.pain}/10` : '—'}
          icon={Heart}
        />
        <StatCard
          title="Mobility"
          value={latestCheckIn ? `${latestCheckIn.mobility}/10` : '—'}
          icon={TrendingUp}
        />
        <StatCard
          title="Compliance"
          value={`${Math.round(data.complianceRate)}%`}
          icon={Target}
        />
        <StatCard
          title="Recovery Streak"
          value={`${data.gamification.recovery_streak}d`}
          subtitle={`Exercise: ${data.gamification.exercise_streak}d`}
          icon={Flame}
        />
      </div>

      {data.alerts.length > 0 && (
        <div className="card p-5">
          <h3 className="font-semibold text-clinical-900 mb-3 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
            Monitoring Alerts
          </h3>
          <p className="text-xs text-clinical-500 mb-3">
            These are monitoring alerts for clinician review — not diagnoses.
          </p>
          <div className="space-y-2">
            {data.alerts.map((alert) => (
              <div
                key={alert.id}
                className="flex items-start gap-3 p-3 rounded-lg bg-clinical-50 border border-clinical-200"
              >
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${severityColor(alert.severity)}`}>
                  {alert.severity}
                </span>
                <div>
                  <p className="text-sm text-clinical-800">{alert.message}</p>
                  <p className="text-xs text-clinical-400 mt-0.5">{alert.created_at}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <ProgressCharts
        checkIns={[...data.checkIns].reverse()}
        sessions={[...data.sessions].reverse()}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-5">
          <h3 className="font-semibold text-clinical-900 mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-medical-600" />
            Check-in History
          </h3>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {data.checkIns.map((ci) => (
              <div key={ci.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-clinical-50 text-sm">
                <span className="text-clinical-600">{ci.date}</span>
                <div className="flex gap-3 text-clinical-500">
                  <span>Pain: {ci.pain}</span>
                  <span>Mobility: {ci.mobility}</span>
                  <span className="capitalize">Swelling: {ci.swelling}</span>
                  <span>{ci.exercises_completed ? '✓ Exercises' : '✗ Exercises'}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card p-5">
          <h3 className="font-semibold text-clinical-900 mb-4 flex items-center gap-2">
            <Dumbbell className="w-5 h-5 text-medical-600" />
            Exercise Sessions
          </h3>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {data.sessions.map((s) => (
              <div key={s.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-clinical-50 text-sm">
                <span className="text-clinical-600">{s.created_at.split('T')[0] || s.created_at.slice(0, 10)}</span>
                <div className="flex gap-3 text-clinical-500">
                  <span>{s.reps} reps</span>
                  <span>Form: {Math.round(s.form_score)}%</span>
                  <span>ROM: {Math.round(s.range_of_motion)}°</span>
                </div>
              </div>
            ))}
            {data.sessions.length === 0 && (
              <p className="text-clinical-500 text-sm text-center py-4">No sessions recorded</p>
            )}
          </div>
        </div>
      </div>

      <GeminiAnalysisCard
        initialAnalysis={data.analysis}
        patientId={data.patient.id}
        showRefresh
      />
    </div>
  );
}
