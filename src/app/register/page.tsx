'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Activity, Loader2 } from 'lucide-react';

export default function RegisterPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [condition, setCondition] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setLoading(true); setMessage('');
    const res = await fetch('/api/auth/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, email, password, condition }) });
    const data = await res.json(); setLoading(false);
    setMessage(res.ok ? 'Account created. You can sign in now.' : data.error || 'Registration failed');
  }

  return <div className="min-h-screen bg-gradient-to-br from-medical-50 via-white to-clinical-100 flex items-center justify-center p-4">
    <div className="w-full max-w-md space-y-5 page-enter">
      <div className="text-center"><div className="w-12 h-12 bg-medical-600 rounded-2xl flex items-center justify-center mx-auto mb-3"><Activity className="w-6 h-6 text-white" /></div><h1 className="text-2xl font-bold">Create your account</h1><p className="text-clinical-500 text-sm mt-1">Start tracking your recovery</p></div>
      <form onSubmit={submit} className="card p-6 space-y-4">
        <input className="input-field" placeholder="Full name" value={name} onChange={(e) => setName(e.target.value)} required />
        <input className="input-field" type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <input className="input-field" type="password" minLength={8} placeholder="Password (minimum 8 characters)" value={password} onChange={(e) => setPassword(e.target.value)} required />
        <input className="input-field" placeholder="Rehabilitation condition" value={condition} onChange={(e) => setCondition(e.target.value)} required />
        <p className="text-xs text-medical-800 bg-medical-50 rounded-xl px-3 py-2">Your clinic will assign a clinician after registration.</p>
        {message && <p className={`text-sm rounded-xl px-3 py-2 ${message.startsWith('Account') ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'}`}>{message}</p>}
        <button className="btn-primary w-full flex justify-center gap-2" disabled={loading}>{loading && <Loader2 className="w-4 h-4 animate-spin" />}Create account</button>
      </form>
      <p className="text-center text-sm text-clinical-500">Already have an account? <Link className="text-medical-700 font-medium" href="/login">Sign in</Link></p>
    </div>
  </div>;
}
