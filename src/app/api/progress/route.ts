import { NextResponse } from 'next/server';
import { getPatientByUserId, getSession } from '@/lib/auth';
import { getSupabaseAdmin } from '@/lib/supabase';

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== 'patient') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const patient = await getPatientByUserId(session.userId);
  if (!patient) return NextResponse.json({ error: 'Patient not found' }, { status: 404 });

  const supabase = getSupabaseAdmin();
  const [checkInsResult, sessionsResult, gamificationResult] = await Promise.all([
    supabase.from('check_ins').select('*').eq('patient_id', patient.id).order('date', { ascending: true }),
    supabase.from('exercise_sessions').select('*').eq('patient_id', patient.id).order('created_at', { ascending: true }),
    supabase.from('gamification').select('*').eq('patient_id', patient.id).maybeSingle(),
  ]);

  if (checkInsResult.error || sessionsResult.error || gamificationResult.error) {
    console.error('Progress data load failed', {
      checkIns: checkInsResult.error,
      sessions: sessionsResult.error,
      gamification: gamificationResult.error,
    });
    return NextResponse.json({ error: 'Unable to load progress data' }, { status: 500 });
  }

  const checkIns = checkInsResult.data ?? [];
  const sessions = sessionsResult.data ?? [];
  let gamification = gamificationResult.data;
  if (!gamification) {
    const created = await supabase
      .from('gamification')
      .insert({ patient_id: patient.id })
      .select('*')
      .single();
    if (created.error) {
      console.error('Gamification initialization failed', created.error);
      return NextResponse.json({ error: 'Unable to initialize progress data' }, { status: 500 });
    }
    gamification = created.data;
  }

  const complianceRate =
    checkIns.length > 0
      ? (checkIns.filter((c) => c.exercises_completed).length / checkIns.length) * 100
      : 0;

  return NextResponse.json({
    checkIns,
    sessions,
    gamification,
    complianceRate,
    patientName: session.name,
    condition: patient.condition,
    startDate: patient.start_date,
  });
}
