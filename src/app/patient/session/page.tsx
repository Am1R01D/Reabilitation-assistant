'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Camera, Loader2, Play, Square, RotateCcw } from 'lucide-react';
import { useExerciseTracker } from '@/hooks/useExerciseTracker';
import { SafetyBanner } from '@/components/SafetyBanner';
import { getExerciseDefinition } from '@/lib/exercises';

export default function ExerciseSessionPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const exercise = getExerciseDefinition(searchParams.get('exercise'));
  const { videoRef, canvasRef, state, startSession, stopSession } = useExerciseTracker(exercise.id);
  const [saving, setSaving] = useState(false);
  const [results, setResults] = useState<{
    reps: number;
    averageAngle: number;
    rangeOfMotion: number;
    formScore: number;
    exerciseDuration: number;
  } | null>(null);

  async function handleStop() {
    const metrics = stopSession();
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
          <h2 className="text-2xl font-bold text-clinical-900">{exercise.name} Complete</h2>
          <p className="text-clinical-500 mt-1">Great work on your rehabilitation!</p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <ResultCard label="Repetitions" value={String(results.reps)} />
          <ResultCard label="Form Score" value={`${results.formScore}%`} />
          <ResultCard label="Range of Motion" value={`${results.rangeOfMotion}°`} />
          <ResultCard label="Duration" value={`${results.exerciseDuration}s`} />
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => {
              setResults(null);
              startSession();
            }}
            className="btn-secondary flex-1 flex items-center justify-center gap-2"
          >
            <RotateCcw className="w-4 h-4" /> Again
          </button>
          <button onClick={() => router.push('/patient/dashboard')} className="btn-primary flex-1">
            Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-clinical-900">{exercise.name}</h1>
        <p className="text-clinical-500 mt-1">{exercise.cameraInstruction}</p>
      </div>

      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
        <strong>Demo version:</strong> camera tracking currently supports a limited set of rehabilitation exercises.
      </div>

      <SafetyBanner />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 relative">
          <div className="card overflow-hidden bg-black aspect-video relative">
            <video ref={videoRef} className="hidden" playsInline muted />
            <canvas ref={canvasRef} className="w-full h-full object-cover" />
            {!state.isReady && (
              <div className="absolute inset-0 flex items-center justify-center bg-clinical-900/80">
                <div className="text-center text-white">
                  <Camera className="w-10 h-10 mx-auto mb-2 animate-pulse" />
                  <p className="text-sm">Starting camera...</p>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div className="card p-5 text-center">
            <p className="text-sm text-clinical-500 mb-1">Repetitions</p>
            <p className="text-5xl font-bold text-medical-600">{state.reps}</p>
          </div>

          <div className="card p-5">
            <div className="grid grid-cols-2 gap-4 text-center">
              <div>
                <p className="text-xs text-clinical-500">{exercise.angleLabel}</p>
                <p className="text-2xl font-bold text-clinical-900">{state.jointAngle}°</p>
              </div>
              <div>
                <p className="text-xs text-clinical-500">Form Score</p>
                <p className="text-2xl font-bold text-clinical-900">{state.formScore}%</p>
              </div>
            </div>
            <div className="mt-4 text-center">
              <p className="text-xs text-clinical-500 mb-1">Movement State</p>
              <span
                className={`inline-block px-3 py-1 rounded-full text-sm font-medium capitalize ${
                  state.movementState === 'contracted' || state.movementState === 'moving'
                    ? 'bg-medical-100 text-medical-700'
                    : state.movementState === 'extended'
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-clinical-100 text-clinical-600'
                }`}
              >
                {state.movementState}
              </span>
            </div>
          </div>

          <div className="card p-4 bg-medical-50 border-medical-200">
            <p className="text-sm font-medium text-medical-900 text-center">{state.feedback}</p>
          </div>

          <div className="flex gap-2">
            {!state.isRunning ? (
              <button
                onClick={startSession}
                disabled={!state.isReady}
                className="btn-primary flex-1 flex items-center justify-center gap-2"
              >
                <Play className="w-4 h-4" /> Start Session
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
                End Session
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
