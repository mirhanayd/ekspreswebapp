'use client';

import { useEffect } from 'react';

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Admin page failed', error.digest);
  }, [error]);

  return (
    <section className="surface mx-auto max-w-lg space-y-3 p-6 text-center" role="alert">
      <h1 className="font-display text-xl font-bold text-ink-900">Sayfa şu anda yüklenemedi</h1>
      <p className="text-sm text-ink-500">
        Veritabanı bağlantısı geçici olarak yanıt vermiyor olabilir. Tekrar deneyin; sorun sürerse
        oturumu kapatıp yeniden giriş yapın.
      </p>
      <div className="flex flex-wrap justify-center gap-2">
        <button type="button" className="ops-btn ops-btn-primary" onClick={() => reset()}>
          Tekrar dene
        </button>
        <a className="ops-btn ops-btn-secondary" href="/api/auth/logout">
          Yeniden giriş yap
        </a>
      </div>
    </section>
  );
}
