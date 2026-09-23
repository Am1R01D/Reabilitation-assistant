import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { getPatientByUserId, getSession } from '@/lib/auth';
import { getSupabaseAdmin } from '@/lib/supabase';
import type { CheckIn, ExerciseSession } from '@/lib/types';

const CHAT_INSTRUCTIONS = `You are a rehabilitation monitoring assistant. Answer briefly using the patient's recorded check-ins and exercise sessions when relevant. You may summarize trends, explain the app's metrics, and suggest questions to discuss with a clinician. Do not diagnose conditions, prescribe medication, change treatment plans, or present medical advice as a definitive conclusion. If the user reports urgent symptoms such as severe pain, swelling, breathing problems, or a new emergency, tell them to contact their clinician or local emergency services promptly.`;

function cleanEnvironmentValue(value: string | undefined) {
  const cleaned = value?.trim();
  if (!cleaned) return '';
  if ((cleaned.startsWith('"') && cleaned.endsWith('"')) || (cleaned.startsWith("'") && cleaned.endsWith("'"))) {
    return cleaned.slice(1, -1).trim();
  }
  return cleaned;
}

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== 'patient') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const patient = await getPatientByUserId(session.userId);
  if (!patient) return NextResponse.json({ error: 'Patient not found' }, { status: 404 });
  return NextResponse.json({ messages: [] });
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== 'patient') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const patient = await getPatientByUserId(session.userId);
  if (!patient) return NextResponse.json({ error: 'Patient not found' }, { status: 404 });

  const body = await request.json();
  const message = typeof body.message === 'string' ? body.message.trim() : '';
  if (!message || message.length > 1000) return NextResponse.json({ error: 'Message must be between 1 and 1000 characters.' }, { status: 400 });

  const rawHistory: unknown[] = Array.isArray(body.history) ? body.history : [];
  const history = rawHistory
    .filter((item): item is { role: 'user' | 'assistant'; content: string } => {
      if (!item || typeof item !== 'object') return false;
      const candidate = item as { role?: unknown; content?: unknown };
      return (candidate.role === 'user' || candidate.role === 'assistant') && typeof candidate.content === 'string';
    })
    .slice(-12)
    .map((item) => ({ role: item.role, content: item.content.slice(0, 2000) }));

  const supabase = getSupabaseAdmin();
  const [checkInsResult, sessionsResult] = await Promise.all([
    supabase.from('check_ins').select('*').eq('patient_id', patient.id).order('date', { ascending: false }).limit(14),
    supabase.from('exercise_sessions').select('*').eq('patient_id', patient.id).order('created_at', { ascending: false }).limit(10),
  ]);
  if (checkInsResult.error || sessionsResult.error) {
    console.error('Gemini chat context load failed', checkInsResult.error || sessionsResult.error);
    return NextResponse.json({ error: 'Unable to load recovery context' }, { status: 500 });
  }
  const checkIns = (checkInsResult.data ?? []) as CheckIn[];
  const sessions = (sessionsResult.data ?? []) as ExerciseSession[];

  const apiKey = cleanEnvironmentValue(process.env.GEMINI_API_KEY);
  if (!apiKey) {
    return NextResponse.json(
      {
        error: 'Gemini is not configured on this deployment. Add GEMINI_API_KEY to the Vercel project that serves this URL, then redeploy.',
        code: 'GEMINI_KEY_MISSING',
      },
      { status: 503 }
    );
  }

  let reply = '';
  const configuredModel = cleanEnvironmentValue(process.env.GEMINI_MODEL);
  const modelCandidates = Array.from(new Set([
    configuredModel,
    'gemini-3.5-flash',
    'gemini-3.8-flash',
    'gemini-flash-latest',
  ].filter(Boolean)));

  const context = `Condition: ${patient.condition}\nCheck-ins: ${checkIns.map((c) => `${c.date}: pain ${c.pain}/10, mobility ${c.mobility}/10, fatigue ${c.fatigue}/10, sleep ${c.sleep_quality}/10, swelling ${c.swelling}, exercises ${c.exercises_completed ? 'yes' : 'no'}`).join('; ') || 'none'}\nSessions: ${sessions.map((s) => `${s.created_at}: ${s.reps} reps, form ${Math.round(s.form_score)}%, ROM ${Math.round(s.range_of_motion)}°`).join('; ') || 'none'}`;
  const prompt = `${context}\n\nRecent conversation:\n${history.map((item) => `${item.role}: ${item.content}`).join('\n')}\nuser: ${message}\n\nRespond to the latest user message.`;
  const genAI = new GoogleGenerativeAI(apiKey);

  for (const modelName of modelCandidates) {
    try {
      const model = genAI.getGenerativeModel({
        model: modelName,
        systemInstruction: CHAT_INSTRUCTIONS,
      });
      const result = await model.generateContent(prompt);
      reply = result.response.text().trim();
      if (reply) break;
    } catch (error) {
      const status = typeof error === 'object' && error && 'status' in error ? String(error.status) : 'unknown';
      console.error('Gemini chat model failed', { model: modelName, status });
    }
  }

  if (!reply) {
    return NextResponse.json(
      {
        error: 'Gemini could not answer. Check the API key restrictions, quota, and Vercel function logs.',
        code: 'GEMINI_REQUEST_FAILED',
      },
      { status: 502 }
    );
  }

  const now = new Date().toISOString();
  const userMessage = { id: Date.now(), role: 'user' as const, content: message, created_at: now };
  const assistantMessage = { id: Date.now() + 1, role: 'assistant' as const, content: reply, created_at: now };
  return NextResponse.json({ userMessage, assistantMessage });
}
