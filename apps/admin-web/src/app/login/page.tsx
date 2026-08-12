import Image from 'next/image';
import { LockKeyhole, ShieldCheck } from 'lucide-react';
import { LoginForm } from './LoginForm';

export const metadata = { title: 'Giriş | Operasyon Merkezi' };

export default function LoginPage() {
  return (
    <main className="relative grid min-h-screen place-items-center overflow-hidden bg-ink-gradient px-4 py-10">
      <div className="pointer-events-none absolute inset-0 bg-ember-sweep" aria-hidden />
      <div
        className="pointer-events-none absolute -left-40 bottom-0 h-96 w-96 rounded-full bg-brand-800/30 blur-3xl"
        aria-hidden
      />

      <section className="relative w-full max-w-md">
        <div className="mb-5 flex items-center gap-3">
          <span className="grid shrink-0 place-items-center rounded-lg bg-white p-1.5 ring-1 ring-black/5">
            <Image
              src="/brand/logo.png"
              alt="Siirt Kurtalan Ekspres"
              width={104}
              height={42}
              priority
            />
          </span>
          <span className="min-w-0 text-white">
            <span className="block text-2xs font-bold uppercase tracking-[0.16em] text-brand-300">
              Operasyon
            </span>
            <span className="block font-display text-lg font-bold">Merkezi</span>
          </span>
        </div>

        <div className="rounded-2xl border border-ink-200/60 bg-white p-6 shadow-panel sm:p-7">
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-brand-50 text-brand-700 ring-1 ring-inset ring-brand-100">
            <LockKeyhole className="h-5 w-5" aria-hidden />
          </span>
          <h1 className="page-title mt-4 text-2xl">Yönetici girişi</h1>
          <p className="mt-1.5 text-sm text-ink-600">
            Bu alan yalnızca yetkili yönetici hesaplarına açıktır.
          </p>

          <LoginForm />

          <p className="mt-5 flex items-start gap-2 border-t border-ink-100 pt-4 text-2xs leading-5 text-ink-500">
            <ShieldCheck className="mt-px h-3.5 w-3.5 shrink-0 text-ink-400" aria-hidden />
            Oturumlar sunucu tarafında doğrulanır. Yolcu hesapları bu panele erişemez.
          </p>
        </div>
      </section>
    </main>
  );
}
