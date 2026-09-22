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
    if (!user) return NextResponse.json({ error: 'Account profile not found' }, { status: 401 });
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
