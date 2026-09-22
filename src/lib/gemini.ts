import { GoogleGenerativeAI } from '@google/generative-ai';
import type { CheckIn, ExerciseSession, GeminiRecoveryAnalysis } from './types';

const SYSTEM_PROMPT = `You are a rehabilitation data analyst assistant for a MedTech platform.
Your role is to analyze structured patient recovery data and provide monitoring insights.

STRICT RULES — you MUST NOT:
- Diagnose any condition
- Prescribe medication or supplements
- Prescribe or modify treatment plans
- Replace the doctor's medical decisions
- Make definitive medical conclusions

You MAY:
- Summarize trends in pain, mobility, fatigue, and exercise data
- Highlight positive recovery patterns
- Flag concerning changes that warrant clinician review
- Comment on exercise adherence and performance metrics
- Suggest questions or discussion points for the clinician

Always frame outputs as monitoring observations, not medical advice.
Use cautious language like "may warrant review" rather than "you should" or "this means".

Respond ONLY with valid JSON in this exact format:
{
  "summary": "2-3 sentence overview",
  "positiveTrends": ["trend1", "trend2"],
  "concerningChanges": ["change1"],
  "adherenceSummary": "1-2 sentences about exercise compliance",
  "clinicianReviewPoints": ["point1", "point2"]
}`;

function buildPatientDataPrompt(
  checkIns: CheckIn[],
  sessions: ExerciseSession[],
  condition: string
): string {
  const checkInSummary = checkIns
    .slice(0, 14)
    .map(
      (c) =>
        `${c.date}: pain=${c.pain}, swelling=${c.swelling}, mobility=${c.mobility}, fatigue=${c.fatigue}, sleep=${c.sleep_quality}, exercises=${c.exercises_completed ? 'yes' : 'no'}`
    )
    .join('\n');

  const sessionSummary = sessions
    .slice(0, 10)
    .map(
      (s) =>
        `${s.created_at.split('T')[0]}: reps=${s.reps}, avgAngle=${s.average_angle.toFixed(1)}, ROM=${s.range_of_motion.toFixed(1)}, form=${s.form_score.toFixed(1)}, duration=${s.duration}s`
    )
    .join('\n');

  return `Patient condition: ${condition}

Recent check-ins (most recent first):
${checkInSummary || 'No check-ins yet'}

Recent exercise sessions (most recent first):
${sessionSummary || 'No exercise sessions yet'}

Analyze this structured recovery data and return JSON only.`;
}

export async function analyzeRecovery(
  checkIns: CheckIn[],
  sessions: ExerciseSession[],
  condition: string
): Promise<GeminiRecoveryAnalysis> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return generateFallbackAnalysis(checkIns, sessions);
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash',
      systemInstruction: SYSTEM_PROMPT,
    });

    const result = await model.generateContent(buildPatientDataPrompt(checkIns, sessions, condition));
    const text = result.response.text();
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON in response');

    const parsed = JSON.parse(jsonMatch[0]);
    return {
      summary: parsed.summary || 'Analysis unavailable.',
      positiveTrends: parsed.positiveTrends || [],
      concerningChanges: parsed.concerningChanges || [],
      adherenceSummary: parsed.adherenceSummary || '',
      clinicianReviewPoints: parsed.clinicianReviewPoints || [],
    };
  } catch (error) {
    console.error('Gemini analysis failed:', error);
    return generateFallbackAnalysis(checkIns, sessions);
  }
}

function generateFallbackAnalysis(
  checkIns: CheckIn[],
  sessions: ExerciseSession[]
): GeminiRecoveryAnalysis {
  const positiveTrends: string[] = [];
  const concerningChanges: string[] = [];
  const clinicianReviewPoints: string[] = [];

  if (checkIns.length >= 2) {
    const latest = checkIns[0];
    const previous = checkIns[1];
    if (latest.pain < previous.pain) {
      positiveTrends.push(`Pain decreased from ${previous.pain} to ${latest.pain}.`);
    } else if (latest.pain > previous.pain) {
      concerningChanges.push(`Pain increased from ${previous.pain} to ${latest.pain}.`);
      clinicianReviewPoints.push('Review recent pain trend with patient.');
    }
    if (latest.mobility > previous.mobility) {
      positiveTrends.push(`Mobility improved from ${previous.mobility} to ${latest.mobility}.`);
    }
    if (latest.swelling === 'severe') {
      concerningChanges.push('Patient reported severe swelling.');
      clinicianReviewPoints.push('Assess swelling severity at next visit.');
    }
  }

  const completedCount = checkIns.filter((c) => c.exercises_completed).length;
  const adherenceRate = checkIns.length ? (completedCount / checkIns.length) * 100 : 0;

  if (sessions.length > 0) {
    const avgForm = sessions.reduce((s, x) => s + x.form_score, 0) / sessions.length;
    positiveTrends.push(`Average exercise form score: ${avgForm.toFixed(0)}%.`);
  }

  return {
    summary:
      checkIns.length > 0
        ? 'Local analysis based on available check-in and exercise data. Configure GEMINI_API_KEY for AI-powered insights.'
        : 'Insufficient data for analysis. Complete check-ins and exercises to generate insights.',
    positiveTrends,
    concerningChanges,
    adherenceSummary: `${Math.round(adherenceRate)}% exercise compliance over recorded check-ins.`,
    clinicianReviewPoints,
  };
}
