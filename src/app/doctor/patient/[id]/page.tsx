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
import { useLanguage } from '@/components/LanguageProvider';

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
  const { text, language } = useLanguage();

  useEffect(() => {
    fetch(`/api/doctor/patient/${params.id}`)
      .then((r) => r.json())
      .then(setData);
  }, [params.id]);

  if (!data) {
    return <div className="text-center py-20 text-clinical-500 animate-pulse">{text('Loading patient details...', 'Загрузка данных пациента...')}</div>;
  }

  const latestCheckIn = data.checkIns[0];
  const severityColor = (s: string) =>
    s === 'high' ? 'bg-red-100 text-red-800' : s === 'medium' ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800';
  const localizeCondition = (condition: string) => language !== 'ru' ? condition : condition
    .replace('Broken arm', 'Перелом руки')
    .replace('Broken leg', 'Перелом ноги')
    .replace('cast still on', 'гипс ещё не снят')
    .replace('cast removed', 'гипс снят');
  const localizeSeverity = (severity: string) => language !== 'ru' ? severity : ({ high: 'высокий', medium: 'средний', low: 'низкий' }[severity] || severity);
  const localizeSwelling = (swelling: string) => language !== 'ru' ? swelling : ({ none: 'нет', mild: 'лёгкий', severe: 'сильный' }[swelling] || swelling);
  const localizeAlert = (message: string) => language !== 'ru' ? message : message
    .replace('Patient reported severe swelling.', 'Пациент сообщил о сильном отёке.')
    .replace('Pain has increased over several consecutive check-ins. Clinician review recommended.', 'Боль усиливается несколько чек-инов подряд. Рекомендуется проверка врачом.')
    .replace('Exercise form scores have declined recently. Clinician review recommended.', 'Оценка техники упражнений снизилась. Рекомендуется проверка врачом.');

  return (
    <div className="space-y-6">
      <Link href="/doctor/dashboard" className="inline-flex items-center gap-1 text-sm text-clinical-500 hover:text-clinical-700">
        <ArrowLeft className="w-4 h-4" /> {text('Back to patients', 'Назад к пациентам')}
      </Link>

      <div>
        <h1 className="text-2xl font-bold text-clinical-900">{data.patient.name}</h1>
        <p className="text-clinical-500 mt-1">
          {localizeCondition(data.patient.condition)} · {text('Started', 'Начало')}: {data.patient.start_date}
        </p>
      </div>

      <SafetyBanner />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title={text('Pain', 'Боль')}
          value={latestCheckIn ? `${latestCheckIn.pain}/10` : '—'}
          icon={Heart}
        />
        <StatCard
          title={text('Mobility', 'Подвижность')}
          value={latestCheckIn ? `${latestCheckIn.mobility}/10` : '—'}
          icon={TrendingUp}
        />
        <StatCard
          title={text('Compliance', 'Выполнение плана')}
          value={`${Math.round(data.complianceRate)}%`}
          icon={Target}
        />
        <StatCard
          title={text('Recovery Streak', 'Серия чек-инов')}
          value={text(`${data.gamification.recovery_streak}d`, `${data.gamification.recovery_streak} дн.`)}
          subtitle={text(`Exercise: ${data.gamification.exercise_streak}d`, `Упражнения: ${data.gamification.exercise_streak} дн.`)}
          icon={Flame}
        />
      </div>

      {data.alerts.length > 0 && (
        <div className="card p-5">
          <h3 className="font-semibold text-clinical-900 mb-3 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
            {text('Monitoring Alerts', 'Предупреждения мониторинга')}
          </h3>
          <p className="text-xs text-clinical-500 mb-3">
            {text('These are monitoring alerts for clinician review — not diagnoses.', 'Это сигналы для проверки врачом, а не диагнозы.')}
          </p>
          <div className="space-y-2">
            {data.alerts.map((alert) => (
              <div
                key={alert.id}
                className="flex items-start gap-3 p-3 rounded-lg bg-clinical-50 border border-clinical-200"
              >
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${severityColor(alert.severity)}`}>
                  {localizeSeverity(alert.severity)}
                </span>
                <div>
                  <p className="text-sm text-clinical-800">{localizeAlert(alert.message)}</p>
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
            {text('Check-in History', 'История чек-инов')}
          </h3>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {data.checkIns.map((ci) => (
              <div key={ci.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-clinical-50 text-sm">
                <span className="text-clinical-600">{ci.date}</span>
                <div className="flex gap-3 text-clinical-500">
                  <span>{text('Pain', 'Боль')}: {ci.pain}</span>
                  <span>{text('Mobility', 'Подвижность')}: {ci.mobility}</span>
                  <span className="capitalize">{text('Swelling', 'Отёк')}: {localizeSwelling(ci.swelling)}</span>
                  <span>{ci.exercises_completed ? text('✓ Exercises', '✓ Упражнения') : text('✗ Exercises', '✗ Упражнения')}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card p-5">
          <h3 className="font-semibold text-clinical-900 mb-4 flex items-center gap-2">
            <Dumbbell className="w-5 h-5 text-medical-600" />
            {text('Exercise Sessions', 'Тренировки')}
          </h3>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {data.sessions.map((s) => (
              <div key={s.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-clinical-50 text-sm">
                <span className="text-clinical-600">{s.created_at.split('T')[0] || s.created_at.slice(0, 10)}</span>
                <div className="flex gap-3 text-clinical-500">
                  <span>{s.reps} {text('reps', 'повт.')}</span>
                  <span>{text('Form', 'Техника')}: {Math.round(s.form_score)}%</span>
                  <span>{text('ROM', 'Амплитуда')}: {Math.round(s.range_of_motion)}°</span>
                </div>
              </div>
            ))}
            {data.sessions.length === 0 && (
              <p className="text-clinical-500 text-sm text-center py-4">{text('No sessions recorded', 'Тренировок пока нет')}</p>
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
