import { NextRequest, NextResponse } from 'next/server';
import { getPatientByUserId, getSession } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { analyzeRecovery } from '@/lib/gemini';
import type { CheckIn, ExerciseSession } from '@/lib/types';

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let patientId: number;
  let condition: string;

  if (session.role === 'patient') {
    const patient = getPatientByUserId(session.userId);
    if (!patient) return NextResponse.json({ error: 'Patient not found' }, { status: 404 });
    patientId = patient.id;
    condition = patient.condition;
  } else {
    const body = await request.json();
    patientId = body.patientId;
    if (!patientId) {
      return NextResponse.json({ error: 'Patient ID required' }, { status: 400 });
    }
    const db = getDb();
    const patient = db.prepare('SELECT * FROM patients WHERE id = ? AND doctor_id = ?').get(
      patientId,
      session.userId
    ) as { condition: string } | undefined;
    if (!patient) return NextResponse.json({ error: 'Patient not found' }, { status: 404 });
    condition = patient.condition;
  }

  const db = getDb();
  const checkIns = db
    .prepare('SELECT * FROM check_ins WHERE patient_id = ? ORDER BY date DESC LIMIT 14')
    .all(patientId) as CheckIn[];

  const sessions = db
    .prepare(
      'SELECT * FROM exercise_sessions WHERE patient_id = ? ORDER BY created_at DESC LIMIT 10'
    )
    .all(patientId) as ExerciseSession[];

  const analysis = await analyzeRecovery(checkIns, sessions, condition);

  db.prepare(
    `INSERT INTO gemini_analyses (patient_id, summary, positive_trends, concerning_changes, adherence_summary, clinician_points)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(
    patientId,
    analysis.summary,
    JSON.stringify(analysis.positiveTrends),
    JSON.stringify(analysis.concerningChanges),
    analysis.adherenceSummary,
    JSON.stringify(analysis.clinicianReviewPoints)
  );

  return NextResponse.json({ analysis });
}

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  let patientId = searchParams.get('patientId');

  if (session.role === 'patient') {
    const patient = getPatientByUserId(session.userId);
    if (!patient) return NextResponse.json({ error: 'Patient not found' }, { status: 404 });
    patientId = String(patient.id);
  }

  if (!patientId) {
    return NextResponse.json({ error: 'Patient ID required' }, { status: 400 });
  }

  const db = getDb();
  const latest = db
    .prepare(
      'SELECT * FROM gemini_analyses WHERE patient_id = ? ORDER BY created_at DESC LIMIT 1'
    )
    .get(Number(patientId));

  if (!latest) {
    return NextResponse.json({ analysis: null });
  }

  const record = latest as {
    summary: string;
    positive_trends: string;
    concerning_changes: string;
    adherence_summary: string;
    clinician_points: string;
    created_at: string;
  };

  return NextResponse.json({
    analysis: {
      summary: record.summary,
      positiveTrends: JSON.parse(record.positive_trends),
      concerningChanges: JSON.parse(record.concerning_changes),
      adherenceSummary: record.adherence_summary,
      clinicianReviewPoints: JSON.parse(record.clinician_points),
      createdAt: record.created_at,
    },
  });
}
