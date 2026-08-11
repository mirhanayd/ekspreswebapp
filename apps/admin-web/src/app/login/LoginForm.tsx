'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';

export function LoginForm() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError('');
    const data = new FormData(event.currentTarget);
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: data.get('email'), password: data.get('password') }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(payload.message || 'Giriş yapılamadı.');
      setPending(false);
      return;
    }
    router.replace('/dashboard');
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="mt-6 space-y-4">
      <label className="block text-sm font-medium">
        E-posta
        <input
          name="email"
          type="email"
          required
          autoComplete="email"
          className="mt-1 w-full rounded-lg border px-3 py-2.5 outline-none focus:ring-2 focus:ring-red-600"
        />
      </label>
      <label className="block text-sm font-medium">
        Şifre
        <input
          name="password"
          type="password"
          required
          autoComplete="current-password"
          className="mt-1 w-full rounded-lg border px-3 py-2.5 outline-none focus:ring-2 focus:ring-red-600"
        />
      </label>
      {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-red-700 px-4 py-2.5 font-semibold text-white hover:bg-red-800 disabled:opacity-60"
      >
        {pending ? 'Doğrulanıyor…' : 'Yönetim paneline giriş'}
      </button>
    </form>
  );
}
