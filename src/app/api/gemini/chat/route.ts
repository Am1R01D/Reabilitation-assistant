import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { getPatientByUserId, getSession } from '@/lib/auth';
import { getDb } from '@/lib/db';
import type { CheckIn, ExerciseSession } from '@/lib/types';

const CHAT_INSTRUCTIONS = `You are a rehabilitation monitoring assistant. Answer briefly using the patient's recorded check-ins and exercise sessions when relevant. You may summarize trends, explain the app's metrics, and suggest questions to discuss with a clinician. Do not diagnose conditions, prescribe medication, change treatment plans, or present medical advice as a definitive conclusion. If the user reports urgent symptoms such as severe pain, swelling, breathing problems, or a new emergency, tell them to contact their clinician or local emergency services promptly.`;

function fallbackReply(message: string, checkIns: CheckIn[]) {
  if (!checkIns.length) {
    return 'There is no check-in history yet. Complete a daily check-in so the app can show recovery trends. For treatment decisions, please consult your clinician.';
  }
  const latest = checkIns[0];
  return `Your latest check-in records pain ${latest.pain}/10, mobility ${latest.mobility}/10, and swelling as ${latest.swelling}. ${message ? 'Gemini is not configured, so this is a local summary rather than an AI response.' : ''} Please discuss any concerning symptoms with your clinician.`;
}

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== 'patient') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const patient = await getPatientByUserId(session.userId);
  if (!patient) return NextResponse.json({ error: 'Patient not found' }, { status: 404 });

  const messages = getDb()
    .prepare("SELECT id, role, content, created_at FROM gemini_chat_messages WHERE patient_id = ? ORDER BY id DESC LIMIT 40")
    .all(patient.id)
    .reverse();
  return NextResponse.json({ messages });
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== 'patient') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const patient = await getPatientByUserId(session.userId);
  if (!patient) return NextResponse.json({ error: 'Patient not found' }, { status: 404 });

  const body = await request.json();
  const message = typeof body.message === 'string' ? body.message.trim() : '';
  if (!message || message.length > 1000) return NextResponse.json({ error: 'Message must be between 1 and 1000 characters.' }, { status: 400 });

  const db = getDb();
  const userResult = db.prepare("INSERT INTO gemini_chat_messages (patient_id, role, content) VALUES (?, 'user', ?)").run(patient.id, message);
  const userMessage = db.prepare('SELECT id, role, content, created_at FROM gemini_chat_messages WHERE id = ?').get(userResult.lastInsertRowid);
  const checkIns = db.prepare('SELECT * FROM check_ins WHERE patient_id = ? ORDER BY date DESC LIMIT 14').all(patient.id) as unknown as CheckIn[];
  const sessions = db.prepare('SELECT * FROM exercise_sessions WHERE patient_id = ? ORDER BY created_at DESC LIMIT 10').all(patient.id) as unknown as ExerciseSession[];
  const history = db.prepare('SELECT role, content FROM gemini_chat_messages WHERE patient_id = ? ORDER BY id DESC LIMIT 12').all(patient.id).reverse() as Array<{ role: string; content: string }>;

  let reply = fallbackReply(message, checkIns);
  const apiKey = process.env.GEMINI_API_KEY;
  if (apiKey) {
    try {
      const context = `Condition: ${patient.condition}\nCheck-ins: ${checkIns.map((c) => `${c.date}: pain ${c.pain}/10, mobility ${c.mobility}/10, fatigue ${c.fatigue}/10, sleep ${c.sleep_quality}/10, swelling ${c.swelling}, exercises ${c.exercises_completed ? 'yes' : 'no'}`).join('; ') || 'none'}\nSessions: ${sessions.map((s) => `${s.created_at}: ${s.reps} reps, form ${Math.round(s.form_score)}%, ROM ${Math.round(s.range_of_motion)}°`).join('; ') || 'none'}`;
      const model = new GoogleGenerativeAI(apiKey).getGenerativeModel({ model: 'gemini-2.0-flash', systemInstruction: CHAT_INSTRUCTIONS });
      const result = await model.generateContent(`${context}\n\nRecent conversation:\n${history.map((item) => `${item.role}: ${item.content}`).join('\n')}\n\nRespond to the latest user message.`);
      reply = result.response.text().trim() || reply;
    } catch (error) {
      console.error('Gemini chat failed:', error);
    }
  }

  const assistantResult = db.prepare("INSERT INTO gemini_chat_messages (patient_id, role, content) VALUES (?, 'assistant', ?)").run(patient.id, reply);
  const assistantMessage = db.prepare('SELECT id, role, content, created_at FROM gemini_chat_messages WHERE id = ?').get(assistantResult.lastInsertRowid);
  return NextResponse.json({ userMessage, assistantMessage });
}
