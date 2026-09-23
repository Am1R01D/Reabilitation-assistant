'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Camera, Loader2, Play, Square, RotateCcw, Volume2, VolumeX } from 'lucide-react';
import { useExerciseTracker } from '@/hooks/useExerciseTracker';
import { SafetyBanner } from '@/components/SafetyBanner';
import { getExerciseDefinition } from '@/lib/exercises';
import { useLanguage } from '@/components/LanguageProvider';

export default function ExerciseSessionPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const exercise = getExerciseDefinition(searchParams.get('exercise'));
  const { text, language } = useLanguage();
  const exerciseName = language === 'ru' ? exercise.nameRu : exercise.name;
  const { videoRef, canvasRef, state, startSession, stopSession } = useExerciseTracker(exercise.id, language);
  const [saving, setSaving] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const lastSpokenRef = useRef('');
  const [results, setResults] = useState<{
    reps: number;
    averageAngle: number;
    rangeOfMotion: number;
    formScore: number;
    exerciseDuration: number;
  } | null>(null);

  useEffect(() => {
    if (!voiceEnabled || !state.isRunning || !state.feedback || typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    if (lastSpokenRef.current === state.feedback) return;

    lastSpokenRef.current = state.feedback;
    const utterance = new SpeechSynthesisUtterance(state.feedback);
    utterance.lang = language === 'ru' ? 'ru-RU' : 'en-US';
    utterance.rate = 0.95;
    const matchingVoice = window.speechSynthesis
      .getVoices()
      .find((voice) => voice.lang.toLowerCase().startsWith(language));
    if (matchingVoice) utterance.voice = matchingVoice;

    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  }, [language, state.feedback, state.isRunning, voiceEnabled]);

  useEffect(() => () => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) window.speechSynthesis.cancel();
  }, []);

  async function handleStop() {
    const metrics = stopSession();
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) window.speechSynthesis.cancel();
    setSaving(true);

    try {
      await fetch('/api/exercises/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...metrics,
          exerciseType: exercise.id,
        }),
      });
      setResults(metrics);
    } finally {
      setSaving(false);
    }
  }

  if (results) {
    return (
      <div className="max-w-lg mx-auto space-y-6">
        <div className="text-center py-6">
          <h2 className="text-2xl font-bold text-clinical-900">{exerciseName}: {text('complete', 'завершено')}</h2>
          <p className="text-clinical-500 mt-1">{text('Great work on your rehabilitation!', 'Отличная работа!')}</p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <ResultCard label={text('Repetitions', 'Повторения')} value={String(results.reps)} />
          <ResultCard label={text('Form Score', 'Техника')} value={`${results.formScore}%`} />
          <ResultCard label={text('Range of Motion', 'Диапазон движения')} value={`${results.rangeOfMotion}°`} />
          <ResultCard label={text('Duration', 'Длительность')} value={`${results.exerciseDuration}${text('s', 'с')}`} />
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => {
              setResults(null);
              startSession();
            }}
            className="btn-secondary flex-1 flex items-center justify-center gap-2"
          >
            <RotateCcw className="w-4 h-4" /> {text('Again', 'Ещё раз')}
          </button>
          <button onClick={() => router.push('/patient/dashboard')} className="btn-primary flex-1">
            {text('Dashboard', 'Главная')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-clinical-900">{exerciseName}</h1>
            <p className="text-clinical-500 mt-1">{language === 'ru' ? exercise.cameraInstructionRu : exercise.cameraInstruction}</p>
          </div>
          <button
            type="button"
            onClick={() => {
              setVoiceEnabled((enabled) => !enabled);
              lastSpokenRef.current = '';
              if (typeof window !== 'undefined' && 'speechSynthesis' in window) window.speechSynthesis.cancel();
            }}
            className="btn-secondary flex items-center gap-2 text-sm"
            aria-pressed={voiceEnabled}
          >
            {voiceEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
            {voiceEnabled ? text('Voice on', 'Голос включён') : text('Voice off', 'Голос выключен')}
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
        <strong>{text('Demo version:', 'Демо-версия:')}</strong> {text('camera tracking supports a limited set of exercises.', 'камера поддерживает ограниченный набор упражнений.')}
      </div>

      <SafetyBanner />

      <div className="card p-4">
        <h2 className="text-sm font-semibold text-clinical-900">{text('Quick tutorial', 'Краткая инструкция')}</h2>
        <ol className="mt-2 grid gap-2 text-sm text-clinical-600 md:grid-cols-3">
          {(language === 'ru' ? exercise.tutorialRu : exercise.tutorial).map((tutorialStep, index) => (
            <li key={tutorialStep} className="flex gap-2 rounded-lg bg-clinical-50 p-2"><span className="font-bold text-medical-600">{index + 1}</span><span>{tutorialStep}</span></li>
          ))}
        </ol>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 relative">
          <div className="card overflow-hidden bg-black aspect-video relative">
            <video ref={videoRef} className="hidden" playsInline muted />
            <canvas ref={canvasRef} className="w-full h-full object-cover" />
            {!state.isReady && (
              <div className="absolute inset-0 flex items-center justify-center bg-clinical-900/80">
                <div className="text-center text-white">
                  <Camera className="w-10 h-10 mx-auto mb-2 animate-pulse" />
                  <p className="text-sm">{text('Starting camera...', 'Запуск камеры...')}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div className="card p-5 text-center">
            <p className="text-sm text-clinical-500 mb-1">{text('Repetitions', 'Повторения')}</p>
            <p className="text-5xl font-bold text-medical-600">{state.reps}</p>
          </div>

          <div className="card p-5">
            <div className="grid grid-cols-2 gap-4 text-center">
              <div>
                <p className="text-xs text-clinical-500">{language === 'ru' ? exercise.angleLabelRu : exercise.angleLabel}</p>
                <p className="text-2xl font-bold text-clinical-900">{state.jointAngle}°</p>
              </div>
              <div>
                <p className="text-xs text-clinical-500">{text('Form Score', 'Техника')}</p>
                <p className="text-2xl font-bold text-clinical-900">{state.formScore}%</p>
              </div>
            </div>
            <div className="mt-4 text-center">
              <p className="text-xs text-clinical-500 mb-1">{text('Movement State', 'Фаза движения')}</p>
              <span
                className={`inline-block px-3 py-1 rounded-full text-sm font-medium capitalize ${
                  state.movementState === 'contracted' || state.movementState === 'moving'
                    ? 'bg-medical-100 text-medical-700'
                    : state.movementState === 'extended'
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-clinical-100 text-clinical-600'
                }`}
              >
                {language === 'ru' ? ({ idle: 'ожидание', extended: 'разогнуто', contracted: 'согнуто', moving: 'движение' }[state.movementState]) : state.movementState}
              </span>
            </div>
          </div>

          <div className="card p-4 bg-medical-50 border-medical-200">
            <p className="text-sm font-medium text-medical-900 text-center">{state.feedback}</p>
          </div>

          <div className="flex gap-2">
            {!state.isRunning ? (
              <button
                onClick={() => {
                  lastSpokenRef.current = '';
                  startSession();
                }}
                disabled={!state.isReady}
                className="btn-primary flex-1 flex items-center justify-center gap-2"
              >
                <Play className="w-4 h-4" /> {text('Start Session', 'Начать тренировку')}
              </button>
            ) : (
              <button
                onClick={handleStop}
                disabled={saving}
                className="btn-primary flex-1 flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700"
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Square className="w-4 h-4" />
                )}
                {text('End Session', 'Завершить')}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function ResultCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="card p-4 text-center">
      <p className="text-xs text-clinical-500">{label}</p>
      <p className="text-xl font-bold text-clinical-900 mt-1">{value}</p>
    </div>
  );
}
