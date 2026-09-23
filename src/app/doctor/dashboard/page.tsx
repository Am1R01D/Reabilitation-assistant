'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, Users, ArrowRight } from 'lucide-react';
import { SafetyBanner } from '@/components/SafetyBanner';
import { statusColor } from '@/lib/utils';
import { useLanguage } from '@/components/LanguageProvider';

interface PatientSummary {
  id: number;
  name: string;
  email: string;
  condition: string;
  status: string;
  pain: number | null;
  mobility: number | null;
  compliance: number;
  alertCount: number;
  latestCheckIn: { date: string } | null;
  latestSession: { reps: number; form_score: number } | null;
}

export default function DoctorDashboard() {
  const [patients, setPatients] = useState<PatientSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const { text, language } = useLanguage();

  const localizeCondition = (condition: string) => language !== 'ru' ? condition : condition
    .replace('Broken arm', 'Перелом руки')
    .replace('Broken leg', 'Перелом ноги')
    .replace('cast still on', 'гипс ещё не снят')
    .replace('cast removed', 'гипс снят');
  const localizeStatus = (status: string) => language !== 'ru' ? status : ({ stable: 'стабильно', attention: 'требует внимания', improving: 'улучшение' }[status.toLowerCase()] || status);

  useEffect(() => {
    fetch('/api/doctor/patients')
      .then((r) => r.json())
      .then((data) => {
        setPatients(data.patients);
        setLoading(false);
      });
  }, []);

  const totalAlerts = patients.reduce((s, p) => s + p.alertCount, 0);

  if (loading) {
    return <div className="text-center py-20 text-clinical-500 animate-pulse">{text('Loading patients...', 'Загрузка пациентов...')}</div>;
  }

  return (
    <div className="space-y-6 page-enter">
      <div className="rounded-3xl bg-clinical-900 text-white p-6 sm:p-8 flex items-center justify-between gap-4 relative overflow-hidden">
        <div className="absolute -right-12 -top-16 w-52 h-52 rounded-full bg-medical-500/30 blur-2xl" />
        <div>
          <p className="text-medical-200 text-sm font-medium mb-2">{text('CLINICIAN WORKSPACE', 'КАБИНЕТ ВРАЧА')}</p>
          <h1 className="text-3xl font-bold tracking-tight">{text('Patient Overview', 'Обзор пациентов')}</h1>
          <p className="text-clinical-300 mt-2">{text('Monitor recovery progress and alerts', 'Следите за восстановлением и важными изменениями')}</p>
        </div>
        {totalAlerts > 0 && (
          <div className="relative flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-800 px-3 py-2 rounded-xl text-sm">
            <AlertTriangle className="w-4 h-4" />
            {text(`${totalAlerts} alert${totalAlerts !== 1 ? 's' : ''} need review`, `Требуют проверки: ${totalAlerts}`)}
          </div>
        )}
      </div>

      <SafetyBanner />

      {patients.length === 0 ? (
        <div className="card p-12 text-center">
          <Users className="w-12 h-12 text-clinical-300 mx-auto mb-3" />
          <p className="text-clinical-500">{text('No patients assigned', 'Нет прикреплённых пациентов')}</p>
        </div>
      ) : (
        <div className="card overflow-hidden shadow-[0_15px_35px_rgba(15,53,58,0.08)]">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-clinical-50 border-b border-clinical-200">
                  <th className="text-left px-4 py-3 font-medium text-clinical-600">{text('Patient', 'Пациент')}</th>
                  <th className="text-left px-4 py-3 font-medium text-clinical-600">{text('Status', 'Статус')}</th>
                  <th className="text-left px-4 py-3 font-medium text-clinical-600">{text('Pain', 'Боль')}</th>
                  <th className="text-left px-4 py-3 font-medium text-clinical-600">{text('Mobility', 'Подвижность')}</th>
                  <th className="text-left px-4 py-3 font-medium text-clinical-600">{text('Compliance', 'Выполнение')}</th>
                  <th className="text-left px-4 py-3 font-medium text-clinical-600">{text('Last Check-in', 'Последний чек-ин')}</th>
                  <th className="text-left px-4 py-3 font-medium text-clinical-600">{text('Performance', 'Результат')}</th>
                  <th className="text-left px-4 py-3 font-medium text-clinical-600">{text('Alerts', 'Предупреждения')}</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {patients.map((patient) => (
                  <tr key={patient.id} className="border-b border-clinical-100 hover:bg-clinical-50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-clinical-900">{patient.name}</p>
                      <p className="text-xs text-clinical-500">{localizeCondition(patient.condition)}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-medium px-2 py-1 rounded-full ${statusColor(patient.status)}`}>
                        {localizeStatus(patient.status)}
                      </span>
                    </td>
                    <td className="px-4 py-3">{patient.pain != null ? `${patient.pain}/10` : '—'}</td>
                    <td className="px-4 py-3">{patient.mobility != null ? `${patient.mobility}/10` : '—'}</td>
                    <td className="px-4 py-3">{patient.compliance}%</td>
                    <td className="px-4 py-3 text-clinical-500">
                      {patient.latestCheckIn?.date || '—'}
                    </td>
                    <td className="px-4 py-3">
                      {patient.latestSession
                        ? text(`${patient.latestSession.reps} reps, ${Math.round(patient.latestSession.form_score)}%`, `${patient.latestSession.reps} повт., техника ${Math.round(patient.latestSession.form_score)}%`)
                        : '—'}
                    </td>
                    <td className="px-4 py-3">
                      {patient.alertCount > 0 ? (
                        <span className="flex items-center gap-1 text-amber-600 font-medium">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          {patient.alertCount}
                        </span>
                      ) : (
                        <span className="text-clinical-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/doctor/patient/${patient.id}`}
                        className="text-medical-600 hover:text-medical-700 flex items-center gap-1"
                      >
                        {text('View', 'Открыть')} <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
