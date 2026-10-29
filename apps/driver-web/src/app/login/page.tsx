'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function DriverLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('sofor@siirtkurtalan.demo');
  const [password, setPassword] = useState('Sofor123!');
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (pending) return;
    setPending(true);
    setError('');
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(body.message || 'Giriş yapılamadı.');
        setPending(false);
        return;
      }
      router.replace('/');
      router.refresh();
    } catch {
      setError('Bağlantı kurulamadı. İnternet bağlantınızı kontrol edip tekrar deneyin.');
      setPending(false);
    }
  }

  return (
    <main className="center-screen">
      <section className="login-card">
        <span className="brand-tile">SKE</span>
        <div>
          <p className="eyebrow">Sürücü operasyon</p>
          <h1>Günün seferi burada.</h1>
          <p className="muted" style={{ marginTop: 6 }}>
            Durakları, yolcuları ve canlı konum paylaşımını tek ekrandan yönetin.
          </p>
        </div>
        <form onSubmit={submit} className="login-form">
          <label className="field">
            E-posta
            <input
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              type="email"
              autoComplete="username"
              required
            />
          </label>
          <label className="field">
            Şifre
            <input
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              type="password"
              autoComplete="current-password"
              required
            />
          </label>
          {error ? (
            <p className="alert" role="alert">
              {error}
            </p>
          ) : null}
          <button className="btn btn-primary btn-lg" disabled={pending} type="submit">
            {pending ? 'Giriş yapılıyor…' : 'Sürücü paneline gir'}
          </button>
        </form>
      </section>
    </main>
  );
}
