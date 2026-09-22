'use client';

import Link from 'next/link';
import { Dumbbell, Camera, Clock, Target, ArrowRight } from 'lucide-react';
import { SafetyBanner } from '@/components/SafetyBanner';

const exercises = [
  {
    id: 'bicep_curl',
    name: 'Bicep Curl',
    description: 'Prescribed by your doctor for upper arm rehabilitation. Uses camera to track form and count repetitions.',
    duration: '5-10 min',
    targetReps: 12,
    muscles: ['Biceps', 'Forearm'],
    available: true,
  },
  {
    id: 'shoulder_raise',
    name: 'Shoulder Raise',
    description: 'Coming soon — shoulder mobility exercise.',
    duration: '5 min',
    targetReps: 10,
    muscles: ['Deltoids'],
    available: false,
  },
];

export default function ExercisesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-clinical-900">Exercises</h1>
        <p className="text-clinical-500 mt-1">Doctor-prescribed rehabilitation exercises</p>
      </div>

      <SafetyBanner />

      <div className="grid gap-4">
        {exercises.map((exercise) => (
          <div
            key={exercise.id}
            className={`card p-5 ${exercise.available ? '' : 'opacity-60'}`}
          >
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-medical-50 rounded-xl flex items-center justify-center shrink-0">
                <Dumbbell className="w-6 h-6 text-medical-600" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold text-clinical-900">{exercise.name}</h3>
                  {!exercise.available && (
                    <span className="text-xs bg-clinical-100 text-clinical-500 px-2 py-0.5 rounded-full">
                      Coming Soon
                    </span>
                  )}
                </div>
                <p className="text-sm text-clinical-600 mb-3">{exercise.description}</p>
                <div className="flex flex-wrap gap-3 text-xs text-clinical-500">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" /> {exercise.duration}
                  </span>
                  <span className="flex items-center gap-1">
                    <Target className="w-3.5 h-3.5" /> {exercise.targetReps} reps
                  </span>
                  <span className="flex items-center gap-1">
                    <Camera className="w-3.5 h-3.5" /> Camera tracking
                  </span>
                </div>
              </div>
              {exercise.available && (
                <Link
                  href="/patient/session"
                  className="btn-primary text-sm flex items-center gap-1.5 shrink-0"
                >
                  Start <ArrowRight className="w-4 h-4" />
                </Link>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
