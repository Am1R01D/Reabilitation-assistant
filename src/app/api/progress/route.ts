import { NextResponse } from 'next/server';
import { getPatientByUserId, getSession } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { getGamification } from '@/lib/gamification';
import type { CheckIn, ExerciseSession } from '@/lib/types';

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== 'patient') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const patient = await getPatientByUserId(session.userId);
  if (!patient) return NextResponse.json({ error: 'Patient not found' }, { status: 404 });

  const db = getDb();
  const checkIns = db
    .prepare('SELECT * FROM check_ins WHERE patient_id = ? ORDER BY date ASC')
    .all(patient.id) as unknown as CheckIn[];

  const sessions = db
    .prepare('SELECT * FROM exercise_sessions WHERE patient_id = ? ORDER BY created_at ASC')
    .all(patient.id) as unknown as ExerciseSession[];

  const gamification = getGamification(patient.id);

  const complianceRate =
    checkIns.length > 0
      ? (checkIns.filter((c) => c.exercises_completed).length / checkIns.length) * 100
      : 0;

  return NextResponse.json({
    checkIns,
    sessions,
    gamification,
    complianceRate,
    condition: patient.condition,
    startDate: patient.start_date,
  });
}
