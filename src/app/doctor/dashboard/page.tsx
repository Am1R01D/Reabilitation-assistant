'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, Users, ArrowRight } from 'lucide-react';
import { SafetyBanner } from '@/components/SafetyBanner';
import { statusColor } from '@/lib/utils';

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
    return <div className="text-center py-20 text-clinical-500 animate-pulse">Loading patients...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-clinical-900">Patient Overview</h1>
          <p className="text-clinical-500 mt-1">Monitor recovery progress and alerts</p>
        </div>
        {totalAlerts > 0 && (
          <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-800 px-3 py-2 rounded-lg text-sm">
            <AlertTriangle className="w-4 h-4" />
            {totalAlerts} alert{totalAlerts !== 1 ? 's' : ''} need review
          </div>
        )}
      </div>

      <SafetyBanner />

      {patients.length === 0 ? (
        <div className="card p-12 text-center">
          <Users className="w-12 h-12 text-clinical-300 mx-auto mb-3" />
          <p className="text-clinical-500">No patients assigned</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-clinical-50 border-b border-clinical-200">
                  <th className="text-left px-4 py-3 font-medium text-clinical-600">Patient</th>
                  <th className="text-left px-4 py-3 font-medium text-clinical-600">Status</th>
                  <th className="text-left px-4 py-3 font-medium text-clinical-600">Pain</th>
                  <th className="text-left px-4 py-3 font-medium text-clinical-600">Mobility</th>
                  <th className="text-left px-4 py-3 font-medium text-clinical-600">Compliance</th>
                  <th className="text-left px-4 py-3 font-medium text-clinical-600">Last Check-in</th>
                  <th className="text-left px-4 py-3 font-medium text-clinical-600">Performance</th>
                  <th className="text-left px-4 py-3 font-medium text-clinical-600">Alerts</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {patients.map((patient) => (
                  <tr key={patient.id} className="border-b border-clinical-100 hover:bg-clinical-50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-clinical-900">{patient.name}</p>
                      <p className="text-xs text-clinical-500">{patient.condition}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-medium px-2 py-1 rounded-full ${statusColor(patient.status)}`}>
                        {patient.status}
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
                        ? `${patient.latestSession.reps} reps, ${Math.round(patient.latestSession.form_score)}%`
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
                        View <ArrowRight className="w-3.5 h-3.5" />
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
