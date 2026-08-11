'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useState } from 'react';
import { ArrowRight, LockKeyhole, Mail, UserRound } from 'lucide-react';
import { safeReturnTo } from '@/lib/auth';

export function AuthForm({ mode, returnTo }: { mode: 'login' | 'register'; returnTo?: string }) {
  const router = useRouter();
  const [fields, setFields] = useState({ firstName: '', lastName: '', email: '', password: '' });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const update = (name: keyof typeof fields, value: string) =>
    setFields((current) => ({ ...current, [name]: value }));

  async function submit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/auth/${mode}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fields),
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

  const inputClass = 'field-control pl-11';
  return (
    <form onSubmit={submit} className="space-y-4">
      {mode === 'register' && (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Ad" icon={<UserRound />}>
            <input
              value={fields.firstName}
              onChange={(e) => update('firstName', e.target.value)}
              required
              minLength={2}
              autoComplete="given-name"
              className={inputClass}
            />
          </Field>
          <Field label="Soyad" icon={<UserRound />}>
            <input
              value={fields.lastName}
              onChange={(e) => update('lastName', e.target.value)}
              required
              minLength={2}
              autoComplete="family-name"
              className={inputClass}
            />
          </Field>
        </div>
      )}
      <Field label="E-posta" icon={<Mail />}>
        <input
          type="email"
          value={fields.email}
          onChange={(e) => update('email', e.target.value)}
          required
          autoComplete="email"
          className={inputClass}
        />
      </Field>
      <Field label="Şifre" icon={<LockKeyhole />}>
        <input
          type="password"
          value={fields.password}
          onChange={(e) => update('password', e.target.value)}
          required
          minLength={mode === 'register' ? 8 : 1}
          autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
          className={inputClass}
        />
      </Field>
      {error && (
        <p
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-800"
        >
          {error}
        </p>
      )}
      <button type="submit" disabled={loading} className="primary-action w-full">
        {loading ? 'İşleniyor…' : mode === 'login' ? 'Giriş Yap' : 'Hesap Oluştur'}
        <ArrowRight className="h-5 w-5" />
      </button>
      <p className="text-center text-sm text-slate-500">
        {mode === 'login' ? 'Henüz hesabınız yok mu?' : 'Zaten hesabınız var mı?'}{' '}
        <Link
          href={mode === 'login' ? '/register' : '/login'}
          className="font-bold text-red-700 hover:underline"
        >
          {mode === 'login' ? 'Kayıt olun' : 'Giriş yapın'}
        </Link>
      </p>
    </form>
  );
}

function Field({
  label,
  icon,
  children,
}: {
  label: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <label className="block text-sm font-bold text-slate-700">
      <span className="mb-2 block">{label}</span>
      <span className="relative block">
        <span className="pointer-events-none absolute left-3.5 top-3.5 text-red-700 [&>svg]:h-5 [&>svg]:w-5">
          {icon}
        </span>
        {children}
      </span>
    </label>
  );
}
