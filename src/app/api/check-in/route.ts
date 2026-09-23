import { NextRequest, NextResponse } from 'next/server';
import { getPatientByUserId, getSession } from '@/lib/auth';
import { getSupabaseAdmin } from '@/lib/supabase';
import { todayDateString } from '@/lib/utils';
import type { SwellingLevel } from '@/lib/types';

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== 'patient') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const patient = await getPatientByUserId(session.userId);
  if (!patient) return NextResponse.json({ error: 'Patient not found' }, { status: 404 });

  const supabase = getSupabaseAdmin();
  const { data: checkIns, error } = await supabase
    .from('check_ins')
    .select('*')
    .eq('patient_id', patient.id)
    .order('date', { ascending: false })
    .limit(30);
  if (error) {
    console.error('Check-in load failed', error);
    return NextResponse.json({ error: 'Unable to load check-ins' }, { status: 500 });
  }
  const today = checkIns?.find((checkIn) => checkIn.date === todayDateString()) ?? null;

  return NextResponse.json({ checkIns: checkIns ?? [], todayCheckIn: today });
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== 'patient') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const patient = await getPatientByUserId(session.userId);
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

  const supabase = getSupabaseAdmin();
  const date = todayDateString();

  const { data: existing, error: existingError } = await supabase
    .from('check_ins')
    .select('id')
    .eq('patient_id', patient.id)
    .eq('date', date)
    .maybeSingle();
  if (existingError) return NextResponse.json({ error: 'Unable to verify check-in' }, { status: 500 });

  if (existing) {
    return NextResponse.json({ error: 'Check-in already completed today' }, { status: 409 });
  }

  const { data: checkIn, error: insertError } = await supabase
    .from('check_ins')
    .insert({
      patient_id: patient.id,
      date,
      pain: Number(pain),
      swelling: swelling as SwellingLevel,
      mobility: Number(mobility),
      fatigue: Number(fatigue),
      sleep_quality: Number(sleepQuality),
      exercises_completed: exercisesCompleted ? 1 : 0,
    })
    .select('*')
    .single();
  if (insertError || !checkIn) {
    console.error('Check-in save failed', insertError);
    return NextResponse.json({ error: 'Unable to save check-in' }, { status: 500 });
  }

  const { data: gamification } = await supabase
    .from('gamification')
    .select('*')
    .eq('patient_id', patient.id)
    .maybeSingle();
  const nextRecoveryStreak = (gamification?.recovery_streak ?? 0) + 1;
  const nextExerciseStreak = exercisesCompleted
    ? (gamification?.exercise_streak ?? 0) + 1
    : 0;
  await supabase.from('gamification').upsert({
    patient_id: patient.id,
    recovery_streak: nextRecoveryStreak,
    exercise_streak: nextExerciseStreak,
    weekly_goal: gamification?.weekly_goal ?? 5,
    weekly_completed: gamification?.weekly_completed ?? 0,
  });

  const alerts = [];
  if (checkIn.swelling === 'severe') {
    alerts.push({ patient_id: patient.id, type: 'severe_swelling', message: 'Patient reported severe swelling during check-in. Clinician review recommended.', severity: 'high' });
  }
  if (Number(checkIn.pain) >= 8) {
    alerts.push({ patient_id: patient.id, type: 'high_pain', message: `Patient reported high pain level (${checkIn.pain}/10). Clinician review recommended.`, severity: 'high' });
  }
  if (alerts.length) await supabase.from('alerts').insert(alerts);

  return NextResponse.json({ checkIn, warning: checkIn.swelling === 'severe' || checkIn.pain >= 8 });
}
