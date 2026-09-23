import { NextRequest, NextResponse } from 'next/server';
import { getPatientByUserId, getSession } from '@/lib/auth';
import { getSupabaseAdmin } from '@/lib/supabase';
import { exerciseDefinitions, parsePatientCondition } from '@/lib/exercises';

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== 'patient') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const patient = await getPatientByUserId(session.userId);
  if (!patient) return NextResponse.json({ error: 'Patient not found' }, { status: 404 });

  const { data: sessions, error } = await getSupabaseAdmin()
    .from('exercise_sessions')
    .select('*')
    .eq('patient_id', patient.id)
    .order('created_at', { ascending: false })
    .limit(30);
  if (error) return NextResponse.json({ error: 'Unable to load exercise sessions' }, { status: 500 });

  return NextResponse.json({ sessions: sessions ?? [] });
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== 'patient') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const patient = await getPatientByUserId(session.userId);
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

  const exercise = exerciseDefinitions.find((item) => item.id === exerciseType);
  if (!exercise) return NextResponse.json({ error: 'Unknown exercise' }, { status: 400 });
  const recovery = parsePatientCondition(patient.condition);
  if (recovery.bodyArea !== 'unknown' && exercise.bodyArea !== recovery.bodyArea) {
    return NextResponse.json({ error: 'Exercise is not part of this recovery plan' }, { status: 403 });
  }
  if (exercise.requiresCastRemoved && !recovery.castRemoved && recovery.bodyArea !== 'unknown') {
    return NextResponse.json({ error: 'Exercise unlocks after cast removal' }, { status: 403 });
  }

  const supabase = getSupabaseAdmin();
  const { data: sessionRecord, error: insertError } = await supabase
    .from('exercise_sessions')
    .insert({
      patient_id: patient.id,
      exercise_type: exercise.id,
      reps: Number(reps),
      average_angle: Number(averageAngle),
      range_of_motion: Number(rangeOfMotion),
      form_score: Number(formScore),
      duration: Number(exerciseDuration),
    })
    .select('*')
    .single();
  if (insertError || !sessionRecord) return NextResponse.json({ error: 'Unable to save exercise session' }, { status: 500 });

  const today = new Date().toISOString().slice(0, 10);
  await supabase
    .from('check_ins')
    .update({ exercises_completed: true })
    .eq('patient_id', patient.id)
    .eq('date', today);

  const weekStart = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const { count } = await supabase
    .from('exercise_sessions')
    .select('id', { count: 'exact', head: true })
    .eq('patient_id', patient.id)
    .gte('created_at', weekStart);
  await supabase.from('gamification').update({ weekly_completed: count ?? 0 }).eq('patient_id', patient.id);

  return NextResponse.json({ session: sessionRecord });
}
