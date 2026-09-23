'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ArrowRight, Camera, Clock, Dumbbell, LockKeyhole, Target } from 'lucide-react';
import { SafetyBanner } from '@/components/SafetyBanner';
import { exerciseDefinitions, parsePatientCondition } from '@/lib/exercises';
import { useLanguage } from '@/components/LanguageProvider';

export default function ExercisesPage() {
  const [condition, setCondition] = useState('');
  const [loading, setLoading] = useState(true);
  const { text } = useLanguage();

  useEffect(() => {
    fetch('/api/auth/me', { cache: 'no-store' })
      .then((response) => response.json())
      .then((data) => setCondition(data.patient?.condition || ''))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="py-20 text-center text-clinical-500 animate-pulse">{text('Loading exercises...', 'Загрузка упражнений...')}</div>;
  }

  const recovery = parsePatientCondition(condition);
  const relevantExercises = recovery.bodyArea === 'unknown'
    ? exerciseDefinitions
    : exerciseDefinitions.filter((exercise) => exercise.bodyArea === recovery.bodyArea);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-clinical-900">{text('Exercises', 'Упражнения')}</h1>
        <p className="text-clinical-500 mt-1">{text('Exercises selected for your recovery plan', 'Упражнения подобраны для вашего плана восстановления')}</p>
      </div>

      <SafetyBanner />

      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
        <strong>{text('Demo version:', 'Демо-версия:')}</strong> {text('the exercise library is limited and camera tracking does not replace clinician supervision.', 'библиотека упражнений ограничена, а камера не заменяет контроль специалиста.')}
      </div>

      <div className="grid gap-4">
        {relevantExercises.map((exercise) => {
          const available = !exercise.requiresCastRemoved || recovery.castRemoved || recovery.bodyArea === 'unknown';
          return (
            <div key={exercise.id} className={`card p-5 ${available ? '' : 'opacity-70'}`}>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                <div className="w-12 h-12 bg-medical-50 rounded-xl flex items-center justify-center shrink-0">
                  {available ? <Dumbbell className="w-6 h-6 text-medical-600" /> : <LockKeyhole className="w-6 h-6 text-clinical-500" />}
                </div>
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <h3 className="font-semibold text-clinical-900">{localizeExercise(exercise.id, text).name}</h3>
                    {!available && <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">{text('Unlocks after cast removal', 'Откроется после снятия гипса')}</span>}
                  </div>
                  <p className="text-sm text-clinical-600 mb-3">{localizeExercise(exercise.id, text).description}</p>
                  <div className="flex flex-wrap gap-3 text-xs text-clinical-500">
                    <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {exercise.duration}</span>
                    <span className="flex items-center gap-1"><Target className="w-3.5 h-3.5" /> {exercise.targetReps} {text('reps', 'повторений')}</span>
                    <span className="flex items-center gap-1"><Camera className="w-3.5 h-3.5" /> {text('MediaPipe tracking', 'Отслеживание MediaPipe')}</span>
                  </div>
                </div>
                {available && (
                  <Link href={`/patient/session?exercise=${exercise.id}`} className="btn-primary text-sm flex items-center justify-center gap-1.5 shrink-0">
                    {text('Start', 'Начать')} <ArrowRight className="w-4 h-4" />
                  </Link>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function localizeExercise(id: string, text: (english: string, russian: string) => string) {
  const translations: Record<string, { name: string; description: string }> = {
    finger_flexion: { name: text('Finger Flexion', 'Сгибание пальцев'), description: text('Slowly open and close your hand while MediaPipe counts each movement.', 'Медленно открывайте и закрывайте ладонь, а MediaPipe посчитает движения.') },
    bicep_curl: { name: text('Bicep Curl', 'Сгибание руки'), description: text('Bend and straighten the arm while MediaPipe tracks the elbow.', 'Сгибайте и разгибайте руку, пока MediaPipe отслеживает локоть.') },
    ankle_pumps: { name: text('Ankle Movements', 'Движения стопой'), description: text('Move the foot gently up and down while MediaPipe follows the ankle.', 'Плавно двигайте стопой вверх и вниз, пока MediaPipe отслеживает голеностоп.') },
    straight_leg_raise: { name: text('Straight Leg Raise', 'Подъём прямой ноги'), description: text('Raise a straight leg while lying down.', 'Поднимайте прямую ногу в положении лёжа.') },
  };
  return translations[id] || { name: id, description: '' };
}
