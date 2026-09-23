'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle, Loader2 } from 'lucide-react';
import { SafetyBanner } from '@/components/SafetyBanner';
import { useLanguage } from '@/components/LanguageProvider';

export default function CheckInPage() {
  const router = useRouter();
  const [pain, setPain] = useState(5);
  const [swelling, setSwelling] = useState('none');
  const [mobility, setMobility] = useState(5);
  const [fatigue, setFatigue] = useState(5);
  const [sleepQuality, setSleepQuality] = useState(5);
  const [exercisesCompleted, setExercisesCompleted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [showWarning, setShowWarning] = useState(false);
  const [alreadyDone, setAlreadyDone] = useState(false);
  const { text } = useLanguage();

  useEffect(() => {
    fetch('/api/check-in')
      .then((r) => r.json())
      .then((data) => {
        if (data.todayCheckIn) setAlreadyDone(true);
      });
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const res = await fetch('/api/check-in', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        pain,
        swelling,
        mobility,
        fatigue,
        sleepQuality,
        exercisesCompleted,
      }),
    });

    const data = await res.json();
    setLoading(false);

    if (res.ok) {
      setSubmitted(true);
      setAlreadyDone(true);
      setShowWarning(data.warning);
    } else {
      alert(data.error || 'Check-in failed');
    }
  }

  function returnToDashboard() {
    router.replace('/patient/dashboard');
    router.refresh();
  }

  if (alreadyDone && !submitted) {
    return (
      <div className="max-w-lg mx-auto text-center py-12">
        <CheckCircle className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-clinical-900">{text('Check-in Complete', 'Чек-ин завершён')}</h2>
        <p className="text-clinical-500 mt-2">{text("You've already checked in today. Great job!", 'Сегодняшний чек-ин уже заполнен!')}</p>
        <button onClick={returnToDashboard} className="btn-primary mt-6">
          {text('Back to Dashboard', 'Вернуться на главную')}
        </button>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="max-w-lg mx-auto space-y-6">
        <div className="text-center py-8">
          <CheckCircle className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-clinical-900">{text('Check-in Recorded', 'Чек-ин сохранён')}</h2>
          <p className="text-clinical-500 mt-2">{text('Your daily recovery data has been saved.', 'Данные о восстановлении сохранены.')}</p>
        </div>
        {showWarning && <SafetyBanner variant="warning" />}
        <button onClick={returnToDashboard} className="btn-primary w-full">
          {text('Back to Dashboard', 'Вернуться на главную')}
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto space-y-6 page-enter">
      <div>
        <h1 className="text-2xl font-bold text-clinical-900">{text('Daily Check-in', 'Ежедневный чек-ин')}</h1>
        <p className="text-clinical-500 mt-1">{text('How are you feeling today?', 'Как вы себя чувствуете сегодня?')}</p>
      </div>

      <SafetyBanner />

      <form onSubmit={handleSubmit} className="card p-6 sm:p-7 space-y-6">
        <ScaleInput label={text('Pain Level', 'Уровень боли')} value={pain} onChange={setPain} min={0} max={10} lowLabel={text('No pain', 'Нет боли')} highLabel={text('Severe', 'Сильная')} />
        <ScaleInput label={text('Mobility', 'Подвижность')} value={mobility} onChange={setMobility} min={0} max={10} lowLabel={text('Limited', 'Ограничена')} highLabel={text('Full', 'Полная')} />
        <ScaleInput label={text('Fatigue', 'Усталость')} value={fatigue} onChange={setFatigue} min={0} max={10} lowLabel={text('Energetic', 'Бодро')} highLabel={text('Exhausted', 'Сильная')} />
        <ScaleInput label={text('Sleep Quality', 'Качество сна')} value={sleepQuality} onChange={setSleepQuality} min={0} max={10} lowLabel={text('Poor', 'Плохое')} highLabel={text('Excellent', 'Отличное')} />

        <div>
          <label className="label">{text('Swelling', 'Отёк')}</label>
          <div className="grid grid-cols-3 gap-2">
            {(['none', 'mild', 'severe'] as const).map((level) => (
              <button
                key={level}
                type="button"
                onClick={() => setSwelling(level)}
                className={`py-2.5 rounded-lg text-sm font-medium capitalize border transition-colors ${
                  swelling === level
                    ? level === 'severe'
                      ? 'bg-red-50 border-red-300 text-red-700'
                      : 'bg-medical-50 border-medical-300 text-medical-700'
                    : 'border-clinical-200 text-clinical-600 hover:bg-clinical-50'
                }`}
              >
                {level}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="label">{text('Exercises Completed Today?', 'Упражнения сегодня выполнены?')}</label>
          <div className="grid grid-cols-2 gap-2">
            {[true, false].map((val) => (
              <button
                key={String(val)}
                type="button"
                onClick={() => setExercisesCompleted(val)}
                className={`py-2.5 rounded-lg text-sm font-medium border transition-colors ${
                  exercisesCompleted === val
                    ? 'bg-medical-50 border-medical-300 text-medical-700'
                    : 'border-clinical-200 text-clinical-600 hover:bg-clinical-50'
                }`}
              >
                {val ? text('Yes', 'Да') : text('No', 'Нет')}
              </button>
            ))}
          </div>
        </div>

        <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2">
          {loading && <Loader2 className="w-4 h-4 animate-spin" />}
          {text('Submit Check-in', 'Сохранить чек-ин')}
        </button>
      </form>
    </div>
  );
}

function ScaleInput({
  label,
  value,
  onChange,
  min,
  max,
  lowLabel,
  highLabel,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  lowLabel: string;
  highLabel: string;
}) {
  return (
    <div>
      <div className="flex justify-between items-center mb-1.5">
        <label className="label mb-0">{label}</label>
        <span className="text-lg font-bold text-medical-600">{value}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-medical-600"
      />
      <div className="flex justify-between text-xs text-clinical-400 mt-1">
        <span>{lowLabel}</span>
        <span>{highLabel}</span>
      </div>
    </div>
  );
}
