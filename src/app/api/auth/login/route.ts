import { NextRequest, NextResponse } from 'next/server';
import { COOKIE_NAME } from '@/lib/auth';
import { getSupabaseAdmin } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password required' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ email, password });
    if (authError || !authData.session || !authData.user) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }
    let { data: user } = await supabase
      .from('users')
      .select('id, name, role, email')
      .eq('auth_user_id', authData.user.id)
      .maybeSingle();

    // Repairs accounts created before their profile/Auth link was stored.
    if (!user) {
      const { data: legacyProfile } = await supabase
        .from('users')
        .select('id, name, role, email')
        .eq('email', email)
        .maybeSingle();
      if (legacyProfile) {
        const { error: linkError } = await supabase
          .from('users')
          .update({ auth_user_id: authData.user.id })
          .eq('id', legacyProfile.id);
        if (!linkError) user = legacyProfile;
      }
    }

    // A Supabase Auth user may exist without an app profile (for example after
    // a partial registration). Recover it instead of blocking sign-in.
    if (!user) {
      let { data: doctor } = await supabase
        .from('users')
        .select('id')
        .eq('role', 'doctor')
        .order('id')
        .limit(1)
        .maybeSingle();
      if (!doctor) {
        const { data: clinic } = await supabase
          .from('users')
          .insert({
            email: 'clinic@rehabassist.local',
            name: 'RehabAssist Clinic',
            role: 'doctor',
            password_hash: '',
          })
          .select('id')
          .single();
        doctor = clinic;
      }

      const profileName =
        typeof authData.user.user_metadata.full_name === 'string'
          ? authData.user.user_metadata.full_name
          : email.split('@')[0];
      const { data: createdProfile } = await supabase
        .from('users')
        .insert({
          email,
          name: profileName,
          role: 'patient',
          password_hash: '',
          auth_user_id: authData.user.id,
        })
        .select('id, name, role, email')
        .maybeSingle();
      if (createdProfile && doctor) {
        const { data: patient } = await supabase
          .from('patients')
          .insert({
            user_id: createdProfile.id,
            doctor_id: doctor.id,
            condition: 'Rehabilitation plan pending',
            start_date: new Date().toISOString().slice(0, 10),
          })
          .select('id')
          .maybeSingle();
        if (patient) await supabase.from('gamification').insert({ patient_id: patient.id });
        user = createdProfile;
      }
    }
    if (!user) return NextResponse.json({ error: 'Unable to create your account profile. Please try again.' }, { status: 500 });
    const response = NextResponse.json({
      user: { id: user.id, name: user.name, role: user.role, email: user.email },
    });

    response.cookies.set(COOKIE_NAME, authData.session.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: authData.session.expires_in,
      path: '/',
    });

    return response;
  } catch {
    return NextResponse.json({ error: 'Login failed' }, { status: 500 });
  }
}
