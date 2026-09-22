import { NextRequest, NextResponse } from 'next/server';
import { getPatientByUserId, getSession } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { evaluateCheckInAlerts, evaluateAdherenceAlerts } from '@/lib/alerts';
import { updateStreaksOnCheckIn } from '@/lib/gamification';
import { todayDateString } from '@/lib/utils';
import type { CheckIn, SwellingLevel } from '@/lib/types';

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== 'patient') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const patient = getPatientByUserId(session.userId);
  if (!patient) return NextResponse.json({ error: 'Patient not found' }, { status: 404 });

  const db = getDb();
  const checkIns = db
    .prepare('SELECT * FROM check_ins WHERE patient_id = ? ORDER BY date DESC LIMIT 30')
    .all(patient.id) as CheckIn[];

  const today = db
    .prepare('SELECT * FROM check_ins WHERE patient_id = ? AND date = ?')
    .get(patient.id, todayDateString());

  return NextResponse.json({ checkIns, todayCheckIn: today || null });
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== 'patient') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const patient = getPatientByUserId(session.userId);
  if (!patient) return NextResponse.json({ error: 'Patient not found' }, { status: 404 });

  const body = await request.json();
  const { pain, swelling, mobility, fatigue, sleepQuality, exercisesCompleted } = body;

  if (
    pain == null ||
    !swelling ||
    mobility == null ||
    fatigue == null ||
    sleepQuality == null ||
    exercisesCompleted == null
  ) {
    return NextResponse.json({ error: 'All fields required' }, { status: 400 });
  }

  const db = getDb();
  const date = todayDateString();

  const existing = db
    .prepare('SELECT id FROM check_ins WHERE patient_id = ? AND date = ?')
    .get(patient.id, date);

  if (existing) {
    return NextResponse.json({ error: 'Check-in already completed today' }, { status: 409 });
  }

  const result = db
    .prepare(
      `INSERT INTO check_ins (patient_id, date, pain, swelling, mobility, fatigue, sleep_quality, exercises_completed)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      patient.id,
      date,
      Number(pain),
      swelling as SwellingLevel,
      Number(mobility),
      Number(fatigue),
      Number(sleepQuality),
      exercisesCompleted ? 1 : 0
    );

  const checkIn = db.prepare('SELECT * FROM check_ins WHERE id = ?').get(result.lastInsertRowid) as CheckIn;

  evaluateCheckInAlerts(patient.id, checkIn);
  evaluateAdherenceAlerts(patient.id);
  updateStreaksOnCheckIn(patient.id, !!exercisesCompleted);

  return NextResponse.json({ checkIn, warning: checkIn.swelling === 'severe' || checkIn.pain >= 8 });
}
