import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import { getSupabaseAdmin } from '../src/lib/supabase';

dotenv.config({ path: '.env.local' });

async function findOrCreateUser(email: string, name: string, role: 'doctor' | 'patient', passwordHash: string) {
  const supabase = getSupabaseAdmin();
  const { data: existing, error: lookupError } = await supabase
    .from('users')
    .select('id, auth_user_id')
    .eq('email', email)
    .maybeSingle();
  if (lookupError) throw lookupError;
  if (existing?.auth_user_id) return existing;

  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password: 'password123',
    email_confirm: true,
  });
  if (authError || !authData.user) throw authError || new Error('Unable to create Supabase Auth user');

  if (existing) {
    const { data, error } = await supabase
      .from('users')
      .update({ auth_user_id: authData.user.id })
      .eq('id', existing.id)
      .select('id')
      .single();
    if (error) throw error;
    return data;
  }

  const { data, error } = await supabase
    .from('users')
    .insert({ email, name, role, password_hash: passwordHash, auth_user_id: authData.user.id })
    .select('id')
    .single();
  if (error) throw error;
  return data;
}

async function seed() {
  const supabase = getSupabaseAdmin();
  const passwordHash = await bcrypt.hash('password123', 10);
  const doctor = await findOrCreateUser('dr.smith@clinic.com', 'Dr. Sarah Smith', 'doctor', passwordHash);
  const john = await findOrCreateUser('john.doe@email.com', 'John Doe', 'patient', passwordHash);
  const maria = await findOrCreateUser('maria.garcia@email.com', 'Maria Garcia', 'patient', passwordHash);

  for (const patient of [
    { user_id: john.id, doctor_id: doctor.id, condition: 'Post-surgical shoulder rehabilitation', start_date: '2025-08-15' },
    { user_id: maria.id, doctor_id: doctor.id, condition: 'Rotator cuff strain recovery', start_date: '2025-09-01' },
  ]) {
    const { data, error } = await supabase.from('patients').upsert(patient, { onConflict: 'user_id' }).select('id').single();
    if (error) throw error;
    const { error: gameError } = await supabase.from('gamification').upsert({ patient_id: data.id });
    if (gameError) throw gameError;
  }
  console.log('Supabase demo accounts created with zero activity. Password: password123');
}

seed().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
