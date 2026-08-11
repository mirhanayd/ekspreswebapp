'use client';

import Link from 'next/link';
import { FormEvent, useId, useState } from 'react';
import { ArrowRight, Eye, EyeOff, LoaderCircle, LockKeyhole, Mail, TriangleAlert, UserRound } from 'lucide-react';
import { safeReturnTo } from '@/lib/auth';

export function AuthForm({ mode, returnTo }: { mode: 'login' | 'register'; returnTo?: string }) {
  const uid = useId();
  const [fields, setFields] = useState({ firstName: '', lastName: '', email: '', password: '' });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
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
      window.location.replace(safeReturnTo(returnTo));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'İşlem tamamlanamadı.');
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4" noValidate={false}>
      {mode === 'register' ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id={`${uid}-first`} label="Ad" icon={<UserRound aria-hidden />}>
            <input
              id={`${uid}-first`}
              value={fields.firstName}
              onChange={(event) => update('firstName', event.target.value)}
              required
              minLength={2}
              autoComplete="given-name"
              className="field field-with-icon"
            />
          </Field>
          <Field id={`${uid}-last`} label="Soyad" icon={<UserRound aria-hidden />}>
            <input
              id={`${uid}-last`}
              value={fields.lastName}
              onChange={(event) => update('lastName', event.target.value)}
              required
              minLength={2}
              autoComplete="family-name"
              className="field field-with-icon"
            />
          </Field>
        </div>
      ) : null}

      <Field id={`${uid}-email`} label="E-posta" icon={<Mail aria-hidden />}>
        <input
          id={`${uid}-email`}
          type="email"
          value={fields.email}
          onChange={(event) => update('email', event.target.value)}
          required
          autoComplete="email"
          placeholder="ornek@email.com"
          className="field field-with-icon"
        />
      </Field>

      <Field
        id={`${uid}-password`}
        label="Şifre"
        icon={<LockKeyhole aria-hidden />}
        hint={mode === 'register' ? 'En az 8 karakter' : undefined}
      >
        <input
          id={`${uid}-password`}
          type={showPassword ? 'text' : 'password'}
          value={fields.password}
          onChange={(event) => update('password', event.target.value)}
          required
          minLength={mode === 'register' ? 8 : 1}
          autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
          className="field field-with-icon pr-12"
        />
        <button
          type="button"
          onClick={() => setShowPassword((current) => !current)}
          aria-label={showPassword ? 'Şifreyi gizle' : 'Şifreyi göster'}
          className="absolute right-1.5 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-lg text-ink-500 transition hover:bg-ink-100 hover:text-ink-800"
        >
          {showPassword ? (
            <EyeOff className="h-4 w-4" aria-hidden />
          ) : (
            <Eye className="h-4 w-4" aria-hidden />
          )}
        </button>
      </Field>

      {error ? (
        <p role="alert" className="alert-error">
          <TriangleAlert className="mr-1.5 inline h-4 w-4 align-text-bottom" aria-hidden />
          {error}
        </p>
      ) : null}

      <button type="submit" disabled={loading} className="btn btn-primary w-full">
        {loading ? (
          <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden />
        ) : null}
        {loading ? 'İşleniyor…' : mode === 'login' ? 'Giriş Yap' : 'Hesap Oluştur'}
        {!loading ? <ArrowRight className="h-4 w-4" aria-hidden /> : null}
      </button>

      <p className="text-center text-sm text-ink-600">
        {mode === 'login' ? 'Henüz hesabınız yok mu?' : 'Zaten hesabınız var mı?'}{' '}
        <Link href={mode === 'login' ? '/register' : '/login'} className="link-brand">
          {mode === 'login' ? 'Kayıt olun' : 'Giriş yapın'}
        </Link>
      </p>
    </form>
  );
}

function Field({
  id,
  label,
  icon,
  hint,
  children,
}: {
  id: string;
  label: string;
  icon: React.ReactNode;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <label htmlFor={id} className="field-label">
          {label}
        </label>
        {hint ? <span className="mb-1.5 text-2xs font-medium text-ink-400">{hint}</span> : null}
      </div>
      <div className="relative">
        <span className="field-icon">{icon}</span>
        {children}
      </div>
    </div>
  );
}
