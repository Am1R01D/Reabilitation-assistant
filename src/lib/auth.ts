import { cookies } from 'next/headers';
import { getSupabaseAdmin } from './supabase';
import type { User, UserRole } from './types';

const COOKIE_NAME = 'rehab_access_token';

export interface SessionPayload {
  userId: number;
  role: UserRole;
  name: string;
}

export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;

  try {
    const supabase = getSupabaseAdmin();
    const { data: authData, error: authError } = await supabase.auth.getUser(token);
    if (authError || !authData.user) return null;
    const { data: user, error } = await supabase
      .from('users')
      .select('id, role, name')
      .eq('auth_user_id', authData.user.id)
      .single();
    if (error || !user) return null;
    return {
      userId: Number(user.id),
      role: user.role as UserRole,
      name: user.name,
    };
  } catch {
    return null;
  }
}

export async function getUserById(id: number): Promise<User | undefined> {
  const { data } = await getSupabaseAdmin().from('users').select('*').eq('id', id).maybeSingle();
  return data as User | undefined;
}

export async function getPatientByUserId(userId: number) {
  const { data } = await getSupabaseAdmin().from('patients').select('*').eq('user_id', userId).maybeSingle();
  return data as { id: number; user_id: number; doctor_id: number; condition: string; start_date: string } | undefined;
}

export { COOKIE_NAME };
