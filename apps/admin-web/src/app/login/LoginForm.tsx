'use client';

import { FormEvent, useId, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, LoaderCircle, TriangleAlert } from 'lucide-react';

export function LoginForm() {
  const router = useRouter();
  const uid = useId();
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
      <div>
        <label htmlFor={`${uid}-email`} className="ops-label">
          E-posta
        </label>
        <input
          id={`${uid}-email`}
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="admin@siirtkurtalan.demo"
          className="ops-field min-h-11"
        />
      </div>

      <div>
        <label htmlFor={`${uid}-password`} className="ops-label">
          Şifre
        </label>
        <input
          id={`${uid}-password`}
          name="password"
          type="password"
          required
          autoComplete="current-password"
          className="ops-field min-h-11"
        />
      </div>

      {error ? (
        <p
          role="alert"
          className="flex items-start gap-2 rounded-xl border border-brand-200 bg-brand-50 p-3 text-sm font-semibold text-brand-800"
        >
          <TriangleAlert className="mt-px h-4 w-4 shrink-0" aria-hidden />
          {error}
        </p>
      ) : null}

      <button type="submit" disabled={pending} className="ops-btn ops-btn-primary min-h-11 w-full">
        {pending ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden /> : null}
        {pending ? 'Doğrulanıyor…' : 'Yönetim paneline giriş'}
        {!pending ? <ArrowRight className="h-4 w-4" aria-hidden /> : null}
      </button>
    </form>
  );
}
