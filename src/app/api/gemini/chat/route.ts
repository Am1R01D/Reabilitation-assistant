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

function getErrorStatus(error: unknown) {
  if (!error || typeof error !== 'object' || !('status' in error)) return 0;
  return Number(error.status) || 0;
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function createLocalReply(
  language: 'ru' | 'en',
  checkIns: CheckIn[],
  sessions: ExerciseSession[]
) {
  const latest = checkIns[0];
  if (language === 'ru') {
    if (!latest && sessions.length === 0) {
      return 'Gemini временно перегружен. Пока в аккаунте нет данных для анализа — заполните первый чек-ин или выполните упражнение, и я смогу описать ваш прогресс.';
    }
    const checkInText = latest
      ? `Последний чек-ин: боль ${latest.pain}/10, подвижность ${latest.mobility}/10, отёк — ${latest.swelling === 'none' ? 'нет' : latest.swelling === 'mild' ? 'лёгкий' : 'сильный'}.`
      : 'Чек-инов пока нет.';
    const sessionText = sessions[0]
      ? `Последняя тренировка: ${sessions[0].reps} повторений, техника ${Math.round(sessions[0].form_score)}%.`
      : 'Тренировок пока нет.';
    return `Gemini временно перегружен, поэтому показываю локальную сводку. ${checkInText} ${sessionText}`;
  }
  if (!latest && sessions.length === 0) {
    return 'Gemini is temporarily busy. There is no recovery data yet — complete a check-in or exercise to start tracking progress.';
  }
  const checkInText = latest
    ? `Latest check-in: pain ${latest.pain}/10, mobility ${latest.mobility}/10, swelling ${latest.swelling}.`
    : 'No check-ins yet.';
  const sessionText = sessions[0]
    ? `Latest exercise: ${sessions[0].reps} reps with ${Math.round(sessions[0].form_score)}% form.`
    : 'No exercise sessions yet.';
  return `Gemini is temporarily busy, so this is a local summary. ${checkInText} ${sessionText}`;
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
  const language = body.language === 'ru' ? 'ru' : 'en';
  const responseLanguage = language === 'ru' ? 'Russian' : 'English';
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
    'gemini-3.6-flash',
    'gemini-3.5-flash-lite',
    'gemini-3.5-flash',
    'gemini-3.8-flash',
    'gemini-flash-latest',
  ].filter(Boolean)));

  const context = `Condition: ${patient.condition}\nCheck-ins: ${checkIns.map((c) => `${c.date}: pain ${c.pain}/10, mobility ${c.mobility}/10, fatigue ${c.fatigue}/10, sleep ${c.sleep_quality}/10, swelling ${c.swelling}, exercises ${c.exercises_completed ? 'yes' : 'no'}`).join('; ') || 'none'}\nSessions: ${sessions.map((s) => `${s.created_at}: ${s.reps} reps, form ${Math.round(s.form_score)}%, ROM ${Math.round(s.range_of_motion)}°`).join('; ') || 'none'}`;
  const prompt = `${context}\n\nRecent conversation:\n${history.map((item) => `${item.role}: ${item.content}`).join('\n')}\nuser: ${message}\n\nRespond to the latest user message in ${responseLanguage}.`;
  const genAI = new GoogleGenerativeAI(apiKey);

  for (const modelName of modelCandidates) {
    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        const model = genAI.getGenerativeModel({
          model: modelName,
          systemInstruction: CHAT_INSTRUCTIONS,
        });
        const result = await model.generateContent(prompt);
        reply = result.response.text().trim();
        if (reply) break;
      } catch (error) {
        const status = getErrorStatus(error);
        console.error('Gemini chat model failed', { model: modelName, status, attempt: attempt + 1 });
        const retryable = status === 429 || status >= 500;
        if (!retryable || attempt === 1) break;
        await wait(350 * (2 ** attempt));
      }
    }
    if (reply) break;
  }

  if (!reply) {
    reply = createLocalReply(language, checkIns, sessions);
  }

  const now = new Date().toISOString();
  const userMessage = { id: Date.now(), role: 'user' as const, content: message, created_at: now };
  const assistantMessage = { id: Date.now() + 1, role: 'assistant' as const, content: reply, created_at: now };
  return NextResponse.json({ userMessage, assistantMessage });
}
