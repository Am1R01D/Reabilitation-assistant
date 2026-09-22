import { NextResponse } from 'next/server';
import { getPatientByUserId, getSession, getUserById } from '@/lib/auth';

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const user = await getUserById(session.userId);
  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  const patient = session.role === 'patient' ? await getPatientByUserId(session.userId) : null;

  return NextResponse.json({
    user: { id: user.id, name: user.name, role: user.role, email: user.email },
    patient,
  });
}
