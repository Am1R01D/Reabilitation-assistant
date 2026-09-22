import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

export async function GET() {
  const { data, error } = await getSupabaseAdmin()
    .from('users')
    .select('id, name')
    .eq('role', 'doctor')
    .order('name');

  if (error) return NextResponse.json({ error: 'Unable to load clinicians' }, { status: 500 });
  return NextResponse.json({ doctors: data });
}
