import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import bcrypt from 'bcryptjs';
import { getDb } from './db';
import type { User, UserRole } from './types';

const COOKIE_NAME = 'rehab_session';

function getSecret() {
  return new TextEncoder().encode(
    process.env.JWT_SECRET || 'dev-secret-change-in-production'
  );
}

export interface SessionPayload {
  userId: number;
  role: UserRole;
  name: string;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function createSession(user: User): Promise<string> {
  const token = await new SignJWT({
    userId: user.id,
    role: user.role,
    name: user.name,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('7d')
    .sign(getSecret());
  return token;
}

export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, getSecret());
    return {
      userId: payload.userId as number,
      role: payload.role as UserRole,
      name: payload.name as string,
    };
  } catch {
    return null;
  }
}

export function getUserByEmail(email: string): User | undefined {
  const db = getDb();
  return db.prepare('SELECT * FROM users WHERE email = ?').get(email) as User | undefined;
}

export function getUserById(id: number): User | undefined {
  const db = getDb();
  return db.prepare('SELECT * FROM users WHERE id = ?').get(id) as User | undefined;
}

export function getPatientByUserId(userId: number) {
  const db = getDb();
  return db.prepare('SELECT * FROM patients WHERE user_id = ?').get(userId) as
    | { id: number; user_id: number; doctor_id: number; condition: string; start_date: string }
    | undefined;
}

export function getPatientById(patientId: number) {
  const db = getDb();
  return db.prepare('SELECT * FROM patients WHERE id = ?').get(patientId);
}

export { COOKIE_NAME };
