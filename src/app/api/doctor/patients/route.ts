import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { recoveryStatus } from '@/lib/utils';
import type { CheckIn, ExerciseSession } from '@/lib/types';

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== 'doctor') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const db = getDb();
  const patients = db
    .prepare(
      `SELECT p.*, u.name, u.email
       FROM patients p
       JOIN users u ON p.user_id = u.id
       WHERE p.doctor_id = ?
       ORDER BY u.name`
    )
    .all(session.userId) as Array<{
    id: number;
    user_id: number;
    doctor_id: number;
    condition: string;
    start_date: string;
    name: string;
    email: string;
  }>;

  const enriched = patients.map((patient) => {
    const latestCheckIn = db
      .prepare('SELECT * FROM check_ins WHERE patient_id = ? ORDER BY date DESC LIMIT 1')
      .get(patient.id) as unknown as CheckIn | undefined;

    const checkIns = db
      .prepare('SELECT exercises_completed FROM check_ins WHERE patient_id = ?')
      .all(patient.id) as { exercises_completed: number }[];

    const latestSession = db
      .prepare(
        'SELECT * FROM exercise_sessions WHERE patient_id = ? ORDER BY created_at DESC LIMIT 1'
      )
      .get(patient.id) as unknown as ExerciseSession | undefined;

    const alertCount = db
      .prepare(
        'SELECT COUNT(*) as count FROM alerts WHERE patient_id = ? AND acknowledged = 0'
      )
      .get(patient.id) as { count: number };

    const compliance =
      checkIns.length > 0
        ? (checkIns.filter((c) => c.exercises_completed).length / checkIns.length) * 100
        : 0;

    const status = recoveryStatus(
      latestCheckIn?.pain ?? 5,
      latestCheckIn?.mobility ?? 5,
      compliance
    );

    return {
      ...patient,
      latestCheckIn,
      latestSession,
      alertCount: alertCount.count,
      compliance: Math.round(compliance),
      status,
      pain: latestCheckIn?.pain ?? null,
      mobility: latestCheckIn?.mobility ?? null,
    };
  });

  return NextResponse.json({ patients: enriched });
}
