'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useState } from 'react';
import { safeReturnTo } from '@/lib/auth';

export function AuthForm({ mode, returnTo }: { mode: 'login' | 'register'; returnTo?: string }) {
  const router = useRouter();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/auth/${mode}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          ...(mode === 'register' ? { firstName, lastName } : {}),
        }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message || 'İşlem tamamlanamadı.');
      router.replace(safeReturnTo(returnTo));
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'İşlem tamamlanamadı.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      {mode === 'register' && (
        <div className="grid grid-cols-2 gap-3">
          <label className="space-y-1 text-sm font-medium text-gray-700">
            <span>Ad</span>
            <input
              value={firstName}
              onChange={(event) => setFirstName(event.target.value)}
              required
              minLength={2}
              autoComplete="given-name"
              className="w-full rounded-xl border border-gray-300 px-3 py-3"
            />
          </label>
          <label className="space-y-1 text-sm font-medium text-gray-700">
            <span>Soyad</span>
            <input
              value={lastName}
              onChange={(event) => setLastName(event.target.value)}
              required
              minLength={2}
              autoComplete="family-name"
              className="w-full rounded-xl border border-gray-300 px-3 py-3"
            />
          </label>
        </div>
      )}
      <label className="block space-y-1 text-sm font-medium text-gray-700">
        <span>E-posta</span>
        <input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
          autoComplete="email"
          className="w-full rounded-xl border border-gray-300 px-3 py-3"
        />
      </label>
      <label className="block space-y-1 text-sm font-medium text-gray-700">
        <span>Şifre</span>
        <input
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
          minLength={mode === 'register' ? 8 : 1}
          autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
          className="w-full rounded-xl border border-gray-300 px-3 py-3"
        />
      </label>
      {error && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-xl bg-red-700 px-4 py-3 font-semibold text-white disabled:opacity-60"
      >
        {loading ? 'İşleniyor…' : mode === 'login' ? 'Giriş Yap' : 'Hesap Oluştur'}
      </button>
      <p className="text-center text-sm text-gray-500">
        {mode === 'login' ? 'Hesabınız yok mu?' : 'Zaten hesabınız var mı?'}{' '}
        <Link
          href={mode === 'login' ? '/register' : '/login'}
          className="font-semibold text-red-700"
        >
          {mode === 'login' ? 'Kayıt olun' : 'Giriş yapın'}
        </Link>
      </p>
    </form>
  );
}
