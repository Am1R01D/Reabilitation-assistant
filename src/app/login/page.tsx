'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { SafetyBanner } from '@/components/SafetyBanner';
import Link from 'next/link';
import Image from 'next/image';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { useLanguage } from '@/components/LanguageProvider';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { text } = useLanguage();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(text(data.error || 'Login failed', 'Не удалось войти. Проверьте почту и пароль.'));
        return;
      }

      if (data.user.role === 'doctor') {
        router.push('/doctor/dashboard');
      } else {
        router.push('/patient/dashboard');
      }
    } catch {
      setError(text('Connection error. Please try again.', 'Ошибка соединения. Попробуйте ещё раз.'));
    } finally {
      setLoading(false);
    }
  }

  function quickLogin(role: 'patient' | 'doctor') {
    if (role === 'patient') {
      setEmail('john.doe@email.com');
    } else {
      setEmail('dr.smith@clinic.com');
    }
    setPassword('password123');
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-medical-50 via-white to-clinical-100 flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute right-4 top-4 z-10"><LanguageSwitcher /></div>
      <div className="absolute w-80 h-80 -left-32 -bottom-32 rounded-full bg-medical-200/50 blur-3xl" />
      <div className="w-full max-w-md space-y-6 page-enter relative">
        <div className="text-center">
          <div className="w-20 h-20 flex items-center justify-center mx-auto mb-4 float-gentle">
            <Image src="/reassist-logo.png" alt="Re.assist" width={80} height={80} className="h-20 w-20 object-contain" priority />
          </div>
          <h1 className="text-2xl font-bold text-clinical-900">Re.assist</h1>
          <p className="text-clinical-500 mt-1">{text('Home Rehabilitation Platform', 'Платформа домашней реабилитации')}</p>
        </div>

        <div className="card p-6 sm:p-7">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label" htmlFor="email">{text('Email', 'Электронная почта')}</label>
              <input
                id="email"
                type="email"
                className="input-field"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="you@email.com"
              />
            </div>
            <div>
              <label className="label" htmlFor="password">{text('Password', 'Пароль')}</label>
              <input
                id="password"
                type="password"
                className="input-field"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
              />
            </div>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
            )}

            <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2">
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {text('Sign In', 'Войти')}
            </button>
          </form>

          <div className="mt-4 pt-4 border-t border-clinical-200">
            <p className="text-xs text-clinical-500 mb-2">{text('Demo accounts:', 'Демо-аккаунты:')}</p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => quickLogin('patient')}
                className="text-xs btn-secondary flex-1 py-1.5"
              >
                {text('Patient Demo', 'Пациент')}
              </button>
              <button
                type="button"
                onClick={() => quickLogin('doctor')}
                className="text-xs btn-secondary flex-1 py-1.5"
              >
                {text('Doctor Demo', 'Врач')}
              </button>
            </div>
          </div>

          <p className="text-center text-sm text-clinical-500 mt-4">{text('New here?', 'Нет аккаунта?')} <Link href="/register" className="text-medical-700 font-medium">{text('Create an account', 'Зарегистрироваться')}</Link></p>
        </div>

        <SafetyBanner />
      </div>
    </div>
  );
}
