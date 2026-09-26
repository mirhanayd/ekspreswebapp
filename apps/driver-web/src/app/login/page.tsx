'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

export default function DriverLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setError('');
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const body = await response.json().catch(() => ({}));
    setPending(false);
    if (!response.ok) {
      setError(body.message || 'Giriş yapılamadı.');
      return;
    }
    router.replace('/');
    router.refresh();
  }

  return (
    <main className="login-shell">
      <section className="login-card">
        <div className="brand-mark"><Image src="/brand/logo.png" alt="Siirt Kurtalan Ekspres" width={106} height={54} style={{ width: "100%", height: "auto", objectFit: "contain" }} priority /></div>
        <p className="eyebrow">SÜRÜCÜ OPERASYON</p>
        <h1>Günün seferi burada.</h1>
        <p className="muted">
          Durakları, yolcuları ve canlı konum paylaşımını tek ekrandan yönetin.
        </p>
        <form onSubmit={submit} className="login-form">
          <label>
            E-posta
            <input
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              type="email"
              autoComplete="username"
              required
            />
          </label>
          <label>
            Şifre
            <input
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              type="password"
              autoComplete="current-password"
              required
            />
          </label>
          {error ? <p className="error-box">{error}</p> : null}
          <button className="primary-button" disabled={pending} type="submit">
            {pending ? 'Giriş yapılıyor…' : 'Sürücü paneline gir'}
          </button>
        </form>
      </section>
    </main>
  );
}
