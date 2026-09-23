'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import Image from 'next/image';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { useLanguage } from '@/components/LanguageProvider';

export default function RegisterPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [injuryType, setInjuryType] = useState<'broken_arm' | 'broken_leg'>('broken_arm');
  const [castStatus, setCastStatus] = useState<'cast_on' | 'cast_removed'>('cast_on');
  const [message, setMessage] = useState('');
  const [messageSuccess, setMessageSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const { text } = useLanguage();

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setLoading(true); setMessage('');
    const res = await fetch('/api/auth/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, email, password, injuryType, castStatus }) });
    const data = await res.json(); setLoading(false);
    setMessageSuccess(res.ok);
    setMessage(res.ok ? text('Account created. You can sign in now.', 'Аккаунт создан. Теперь можно войти.') : text(data.error || 'Registration failed', 'Не удалось зарегистрироваться. Проверьте данные.'));
  }

  return <div className="min-h-screen bg-gradient-to-br from-medical-50 via-white to-clinical-100 flex items-center justify-center p-4 relative">
    <div className="absolute right-4 top-4"><LanguageSwitcher /></div>
    <div className="w-full max-w-md space-y-5 page-enter">
      <div className="text-center"><div className="w-16 h-16 flex items-center justify-center mx-auto mb-3"><Image src="/reassist-logo.png" alt="Re.assist" width={64} height={64} className="h-16 w-16 object-contain" priority /></div><h1 className="text-2xl font-bold">{text('Create your Re.assist account', 'Создайте аккаунт Re.assist')}</h1><p className="text-clinical-500 text-sm mt-1">{text('Start tracking your recovery', 'Начните отслеживать восстановление')}</p></div>
      <form onSubmit={submit} className="card p-6 space-y-4">
        <input className="input-field" placeholder={text('Full name', 'Имя и фамилия')} value={name} onChange={(e) => setName(e.target.value)} required />
        <input className="input-field" type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <input className="input-field" type="password" minLength={8} placeholder={text('Password (minimum 8 characters)', 'Пароль (минимум 8 символов)')} value={password} onChange={(e) => setPassword(e.target.value)} required />
        <div>
          <label className="label">{text('Injury', 'Травма')}</label>
          <select className="input-field" value={injuryType} onChange={(e) => setInjuryType(e.target.value as 'broken_arm' | 'broken_leg')}>
            <option value="broken_arm">{text('Broken arm', 'Сломанная рука')}</option>
            <option value="broken_leg">{text('Broken leg', 'Сломанная нога')}</option>
          </select>
        </div>
        <div>
          <label className="label">{text('Cast status', 'Статус гипса')}</label>
          <select className="input-field" value={castStatus} onChange={(e) => setCastStatus(e.target.value as 'cast_on' | 'cast_removed')}>
            <option value="cast_on">{text('Cast is still on', 'Гипс ещё не снят')}</option>
            <option value="cast_removed">{text('Cast has been removed', 'Гипс уже снят')}</option>
          </select>
        </div>
        <p className="text-xs text-medical-800 bg-medical-50 rounded-xl px-3 py-2">{text('Your recovery plan will be created from the selected injury and cast status.', 'План восстановления будет создан по выбранной травме и статусу гипса.')}</p>
        {message && <p className={`text-sm rounded-xl px-3 py-2 ${messageSuccess ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'}`}>{message}</p>}
        <button className="btn-primary w-full flex justify-center gap-2" disabled={loading}>{loading && <Loader2 className="w-4 h-4 animate-spin" />}{text('Create account', 'Создать аккаунт')}</button>
      </form>
      <p className="text-center text-sm text-clinical-500">{text('Already have an account?', 'Уже есть аккаунт?')} <Link className="text-medical-700 font-medium" href="/login">{text('Sign in', 'Войти')}</Link></p>
    </div>
  </div>;
}
