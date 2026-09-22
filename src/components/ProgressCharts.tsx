'use client';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts';

interface CheckInData {
  date: string;
  pain: number;
  mobility: number;
  exercises_completed: number;
}

interface SessionData {
  created_at: string;
  range_of_motion: number;
  form_score: number;
  reps: number;
}

interface ProgressChartsProps {
  checkIns: CheckInData[];
  sessions: SessionData[];
}

export function ProgressCharts({ checkIns, sessions }: ProgressChartsProps) {
  const painData = checkIns.map((c) => ({
    date: c.date.slice(5),
    pain: c.pain,
    mobility: c.mobility,
  }));

  const complianceData = checkIns.map((c) => ({
    date: c.date.slice(5),
    completed: c.exercises_completed ? 1 : 0,
  }));

  const sessionData = sessions.map((s) => ({
    date: s.created_at.split('T')[0]?.slice(5) || s.created_at.slice(5, 10),
    rom: Math.round(s.range_of_motion),
    form: Math.round(s.form_score),
    reps: s.reps,
  }));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="card p-5">
        <h3 className="font-semibold text-clinical-900 mb-4">Pain & Mobility</h3>
        {painData.length > 0 ? (
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={painData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="#94a3b8" />
              <YAxis domain={[0, 10]} tick={{ fontSize: 12 }} stroke="#94a3b8" />
              <Tooltip />
              <Line type="monotone" dataKey="pain" stroke="#ef4444" strokeWidth={2} name="Pain" dot={{ r: 3 }} />
              <Line type="monotone" dataKey="mobility" stroke="#2d9186" strokeWidth={2} name="Mobility" dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-clinical-500 text-sm py-8 text-center">No check-in data yet</p>
        )}
      </div>

      <div className="card p-5">
        <h3 className="font-semibold text-clinical-900 mb-4">Exercise Compliance</h3>
        {complianceData.length > 0 ? (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={complianceData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="#94a3b8" />
              <YAxis domain={[0, 1]} ticks={[0, 1]} tickFormatter={(v) => (v ? 'Yes' : 'No')} stroke="#94a3b8" />
              <Tooltip formatter={(v: number) => (v ? 'Completed' : 'Missed')} />
              <Bar dataKey="completed" fill="#2d9186" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-clinical-500 text-sm py-8 text-center">No compliance data yet</p>
        )}
      </div>

      <div className="card p-5 lg:col-span-2">
        <h3 className="font-semibold text-clinical-900 mb-4">Exercise Performance</h3>
        {sessionData.length > 0 ? (
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={sessionData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="#94a3b8" />
              <YAxis tick={{ fontSize: 12 }} stroke="#94a3b8" />
              <Tooltip />
              <Line type="monotone" dataKey="rom" stroke="#6366f1" strokeWidth={2} name="Range of Motion" dot={{ r: 3 }} />
              <Line type="monotone" dataKey="form" stroke="#2d9186" strokeWidth={2} name="Form Score" dot={{ r: 3 }} />
              <Line type="monotone" dataKey="reps" stroke="#f59e0b" strokeWidth={2} name="Reps" dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-clinical-500 text-sm py-8 text-center">No exercise sessions yet</p>
        )}
      </div>
    </div>
  );
}
