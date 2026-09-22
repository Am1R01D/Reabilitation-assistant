import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  const { name, email, password, condition } = await request.json();
  if (!name || !email || !password || !condition) {
    return NextResponse.json({ error: 'All fields are required' }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  const { data: doctor } = await supabase
    .from('users')
    .select('id')
    .eq('role', 'doctor')
    .order('id')
    .limit(1)
    .maybeSingle();
  if (!doctor) return NextResponse.json({ error: 'No clinician is available yet. Run the Supabase seed command first.' }, { status: 503 });

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
