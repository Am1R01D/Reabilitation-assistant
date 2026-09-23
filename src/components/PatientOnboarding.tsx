'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import { ArrowRight, Brain, Camera, Sparkles, X } from 'lucide-react';
import { useLanguage } from './LanguageProvider';

export function PatientOnboarding() {
  const { text } = useLanguage();
  const [step, setStep] = useState(0);
  const [storageKey, setStorageKey] = useState('');
  const [open, setOpen] = useState(false);

  useEffect(() => {
    fetch('/api/auth/me', { cache: 'no-store' })
      .then((response) => response.json())
      .then((data) => {
        if (!data.user?.id) return;
        const key = `reassist-onboarding:${data.user.id}`;
        setStorageKey(key);
        setOpen(window.localStorage.getItem(key) !== 'complete');
      })
      .catch(() => undefined);
  }, []);

  const slides = [
    {
      icon: <Image src="/reassist-logo.png" alt="Re.assist" width={76} height={76} className="h-20 w-20 object-contain" />,
      title: text('Welcome to Re.assist', 'Добро пожаловать в Re.assist'),
      body: text('We are building a simple digital assistant for safe and understandable home rehabilitation.', 'Мы создаём удобного цифрового помощника для безопасной и понятной домашней реабилитации.'),
    },
    {
      icon: <Camera className="h-12 w-12 text-medical-600" />,
      title: text('Camera-based movement tracking', 'Контроль движений через камеру'),
      body: text('MediaPipe follows body and hand landmarks, counts repetitions, and helps you understand exercise form. Video stays in your browser.', 'MediaPipe отслеживает тело и кисти, считает повторения и помогает контролировать технику. Видео остаётся в вашем браузере.'),
    },
    {
      icon: <Brain className="h-12 w-12 text-medical-600" />,
      title: text('AI-assisted recovery', 'Восстановление с поддержкой ИИ'),
      body: text('Gemini explains your check-ins and training progress. It supports monitoring but does not replace a clinician.', 'Gemini объясняет данные чек-инов и тренировок. ИИ помогает наблюдать за прогрессом, но не заменяет врача.'),
    },
    {
      icon: <Sparkles className="h-12 w-12 text-medical-600" />,
      title: text('An MVP focused on fractures', 'MVP для восстановления после переломов'),
      body: text('Today Re.assist focuses on arm and leg fractures. In future versions we plan to add more therapeutic exercise programs for other rehabilitation needs.', 'Сейчас Re.assist специализируется на переломах руки и ноги. В дальнейшем мы планируем добавить больше программ ЛФК для других задач реабилитации.'),
    },
  ];

  function close() {
    if (storageKey) window.localStorage.setItem(storageKey, 'complete');
    setOpen(false);
  }

  if (!open) return null;
  const slide = slides[step];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-clinical-900/55 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-lg overflow-hidden rounded-3xl bg-white p-7 shadow-2xl sm:p-9">
        <button onClick={close} className="absolute right-4 top-4 rounded-full p-2 text-clinical-400 hover:bg-clinical-100" aria-label={text('Close', 'Закрыть')}>
          <X className="h-5 w-5" />
        </button>
        <div key={step} className="page-enter text-center">
          <div className="mx-auto mb-5 flex h-24 w-24 items-center justify-center rounded-3xl bg-medical-50">{slide.icon}</div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-medical-600">Re.assist · {step + 1}/{slides.length}</p>
          <h2 className="mt-3 text-2xl font-bold text-clinical-900">{slide.title}</h2>
          <p className="mx-auto mt-3 max-w-md leading-relaxed text-clinical-600">{slide.body}</p>
        </div>
        <div className="mt-7 flex items-center justify-between">
          <div className="flex gap-1.5">
            {slides.map((_, index) => <span key={index} className={`h-2 rounded-full transition-all ${index === step ? 'w-7 bg-medical-600' : 'w-2 bg-clinical-200'}`} />)}
          </div>
          {step < slides.length - 1 ? (
            <button onClick={() => setStep((current) => current + 1)} className="btn-primary flex items-center gap-2">{text('Next', 'Далее')} <ArrowRight className="h-4 w-4" /></button>
          ) : (
            <button onClick={close} className="btn-primary">{text('Get started', 'Начать')}</button>
          )}
        </div>
      </div>
    </div>
  );
}
