import { NextRequest, NextResponse } from 'next/server';
import { getPatientByUserId, getSession } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { evaluatePerformanceAlerts } from '@/lib/alerts';
import { updateWeeklyProgress } from '@/lib/gamification';
import type { ExerciseSession } from '@/lib/types';

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== 'patient') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const patient = getPatientByUserId(session.userId);
  if (!patient) return NextResponse.json({ error: 'Patient not found' }, { status: 404 });

  const db = getDb();
  const sessions = db
    .prepare(
      'SELECT * FROM exercise_sessions WHERE patient_id = ? ORDER BY created_at DESC LIMIT 30'
    )
    .all(patient.id);

  return NextResponse.json({ sessions });
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== 'patient') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const patient = getPatientByUserId(session.userId);
  if (!patient) return NextResponse.json({ error: 'Patient not found' }, { status: 404 });

  const { reps, averageAngle, rangeOfMotion, formScore, exerciseDuration, exerciseType } =
    await request.json();

  if (
    reps == null ||
    averageAngle == null ||
    rangeOfMotion == null ||
    formScore == null ||
    exerciseDuration == null
  ) {
    return NextResponse.json({ error: 'All metrics required' }, { status: 400 });
  }

  const db = getDb();
  const result = db
    .prepare(
      `INSERT INTO exercise_sessions (patient_id, exercise_type, reps, average_angle, range_of_motion, form_score, duration)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      patient.id,
      exerciseType || 'bicep_curl',
      Number(reps),
      Number(averageAngle),
      Number(rangeOfMotion),
      Number(formScore),
      Number(exerciseDuration)
    );

  updateWeeklyProgress(patient.id);

  const allSessions = db
    .prepare(
      'SELECT * FROM exercise_sessions WHERE patient_id = ? ORDER BY created_at DESC LIMIT 10'
    )
    .all(patient.id) as ExerciseSession[];

  evaluatePerformanceAlerts(patient.id, allSessions);

  const sessionRecord = db
    .prepare('SELECT * FROM exercise_sessions WHERE id = ?')
    .get(result.lastInsertRowid);

  return NextResponse.json({ session: sessionRecord });
}
