import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { getAlertsForPatient } from '@/lib/alerts';
import { getGamification } from '@/lib/gamification';
import type { CheckIn, ExerciseSession } from '@/lib/types';

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session || session.role !== 'doctor') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const patientId = Number(params.id);
  const db = getDb();

  const patient = db
    .prepare(
      `SELECT p.*, u.name, u.email
       FROM patients p
       JOIN users u ON p.user_id = u.id
       WHERE p.id = ? AND p.doctor_id = ?`
    )
    .get(patientId, session.userId);

  if (!patient) {
    return NextResponse.json({ error: 'Patient not found' }, { status: 404 });
  }

  const checkIns = db
    .prepare('SELECT * FROM check_ins WHERE patient_id = ? ORDER BY date DESC')
    .all(patientId) as unknown as CheckIn[];

  const sessions = db
    .prepare('SELECT * FROM exercise_sessions WHERE patient_id = ? ORDER BY created_at DESC')
    .all(patientId) as unknown as ExerciseSession[];

  const alerts = getAlertsForPatient(patientId);
  const gamification = getGamification(patientId);

  const latestAnalysis = db
    .prepare(
      'SELECT * FROM gemini_analyses WHERE patient_id = ? ORDER BY created_at DESC LIMIT 1'
    )
    .get(patientId) as
    | {
        summary: string;
        positive_trends: string;
        concerning_changes: string;
        adherence_summary: string;
        clinician_points: string;
        created_at: string;
      }
    | undefined;

  const analysis = latestAnalysis
    ? {
        summary: latestAnalysis.summary,
        positiveTrends: JSON.parse(latestAnalysis.positive_trends),
        concerningChanges: JSON.parse(latestAnalysis.concerning_changes),
        adherenceSummary: latestAnalysis.adherence_summary,
        clinicianReviewPoints: JSON.parse(latestAnalysis.clinician_points),
        createdAt: latestAnalysis.created_at,
      }
    : null;

  const complianceRate =
    checkIns.length > 0
      ? (checkIns.filter((c) => c.exercises_completed).length / checkIns.length) * 100
      : 0;

  return NextResponse.json({
    patient,
    checkIns,
    sessions,
    alerts,
    gamification,
    analysis,
    complianceRate,
  });
}
