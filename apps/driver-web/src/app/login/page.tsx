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
        <div className="brand-mark">SKE</div>
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
              required
            />
          </label>
          <label>
            Şifre
            <input
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              type="password"
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
