'use client';

import Link from 'next/link';
import { FormEvent, useId, useState } from 'react';
import { ArrowRight, Eye, EyeOff, LoaderCircle, TriangleAlert } from 'lucide-react';
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
      // A full load, so the server-rendered shell and notification state pick up the new session.
      window.location.replace(safeReturnTo(returnTo));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'İşlem tamamlanamadı.');
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      {mode === 'register' ? (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor={`${uid}-first`} className="field-label">
              Ad
            </label>
            <input
              id={`${uid}-first`}
              value={fields.firstName}
              onChange={(event) => update('firstName', event.target.value)}
              required
              minLength={2}
              autoComplete="given-name"
              className="field"
            />
          </div>
          <div>
            <label htmlFor={`${uid}-last`} className="field-label">
              Soyad
            </label>
            <input
              id={`${uid}-last`}
              value={fields.lastName}
              onChange={(event) => update('lastName', event.target.value)}
              required
              minLength={2}
              autoComplete="family-name"
              className="field"
            />
          </div>
        </div>
      ) : null}

      <div>
        <label htmlFor={`${uid}-email`} className="field-label">
          E-posta
        </label>
        <input
          id={`${uid}-email`}
          type="email"
          value={fields.email}
          onChange={(event) => update('email', event.target.value)}
          required
          autoComplete="email"
          placeholder="ornek@email.com"
          className="field"
        />
      </div>

      <div>
        <div className="flex items-baseline justify-between gap-2">
          <label htmlFor={`${uid}-password`} className="field-label">
            Şifre
          </label>
          {mode === 'register' ? (
            <span className="mb-1.5 text-[11px] font-medium text-sk-ink3">En az 8 karakter</span>
          ) : null}
        </div>
        <div className="relative">
          <input
            id={`${uid}-password`}
            type={showPassword ? 'text' : 'password'}
            value={fields.password}
            onChange={(event) => update('password', event.target.value)}
            required
            minLength={mode === 'register' ? 8 : 1}
            autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
            className="field pr-12"
          />
          <button
            type="button"
            onClick={() => setShowPassword((current) => !current)}
            aria-label={showPassword ? 'Şifreyi gizle' : 'Şifreyi göster'}
            className="absolute right-1.5 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full border-0 bg-transparent text-sk-ink3"
          >
            {showPassword ? <EyeOff size={18} aria-hidden /> : <Eye size={18} aria-hidden />}
          </button>
        </div>
      </div>

      {error ? (
        <p
          role="alert"
          className="m-0 flex items-start gap-2 rounded-2xl bg-sk-tint px-3.5 py-2.5 text-[13px] font-semibold text-sk-brandInk"
        >
          <TriangleAlert size={16} aria-hidden className="mt-px flex-none" />
          {error}
        </p>
      ) : null}

      <button type="submit" disabled={loading} className="btn btn-brand w-full">
        {loading ? <LoaderCircle size={18} aria-hidden className="spin" /> : null}
        {loading ? 'İşleniyor…' : mode === 'login' ? 'Giriş Yap' : 'Hesap Oluştur'}
        {!loading ? <ArrowRight size={18} strokeWidth={2.4} aria-hidden /> : null}
      </button>

      <p className="m-0 text-center text-sm text-sk-ink2">
        {mode === 'login' ? 'Henüz hesabın yok mu?' : 'Zaten hesabın var mı?'}{' '}
        <Link
          href={mode === 'login' ? '/register' : '/login'}
          replace
          data-nav="replace"
          className="font-extrabold text-sk-brandInk"
        >
          {mode === 'login' ? 'Kayıt ol' : 'Giriş yap'}
        </Link>
      </p>
    </form>
  );
}
