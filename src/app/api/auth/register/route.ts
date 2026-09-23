import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

async function getOrCreateClinicDoctor() {
  const supabase = getSupabaseAdmin();
  const { data: existing } = await supabase
    .from('users')
    .select('id')
    .eq('role', 'doctor')
    .order('id')
    .limit(1)
    .maybeSingle();
  if (existing) return existing;

  const { data: doctor, error } = await supabase
    .from('users')
    .insert({ email: 'clinic@rehabassist.local', name: 'Re.assist Clinic', role: 'doctor', password_hash: '' })
    .select('id')
    .single();
  if (error || !doctor) throw error || new Error('Unable to create clinic profile');
  return doctor;
}

export async function POST(request: NextRequest) {
  const { name, email, password, injuryType, castStatus } = await request.json();
  const validInjuries = ['broken_arm', 'broken_leg'];
  const validCastStatuses = ['cast_on', 'cast_removed'];
  if (!name || !email || !password || !validInjuries.includes(injuryType) || !validCastStatuses.includes(castStatus)) {
    return NextResponse.json({ error: 'All fields are required' }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  let doctor: { id: number };
  try {
    doctor = await getOrCreateClinicDoctor();
  } catch (error) {
    console.error('Clinic profile setup failed:', error);
    const detail = error instanceof Error ? error.message : 'Unknown Supabase error';
    return NextResponse.json({ error: `Unable to prepare clinic profile: ${detail}` }, { status: 500 });
  }

  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (authError || !authData.user) {
    return NextResponse.json({ error: authError?.message || 'Unable to create account' }, { status: 400 });
  }

  const { data: user, error: userError } = await supabase
    .from('users')
    .insert({ email, name, role: 'patient', password_hash: '', auth_user_id: authData.user.id })
    .select('id')
    .single();
  if (userError || !user) {
    await supabase.auth.admin.deleteUser(authData.user.id);
    return NextResponse.json({ error: 'Unable to create patient profile' }, { status: 500 });
  }

  const condition = `${injuryType === 'broken_arm' ? 'Broken arm' : 'Broken leg'} — ${castStatus === 'cast_on' ? 'cast still on' : 'cast removed'}`;
  const { data: patient, error: patientError } = await supabase.from('patients').insert({
    user_id: user.id, doctor_id: doctor.id, condition, start_date: new Date().toISOString().slice(0, 10),
  }).select('id').single();
  if (patientError || !patient) {
    await supabase.from('users').delete().eq('id', user.id);
    await supabase.auth.admin.deleteUser(authData.user.id);
    return NextResponse.json({ error: 'Unable to create patient profile' }, { status: 500 });
  }

  await supabase.from('gamification').insert({ patient_id: patient.id });
  return NextResponse.json({ success: true }, { status: 201 });
}
