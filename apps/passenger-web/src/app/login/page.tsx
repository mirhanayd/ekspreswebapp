import Link from 'next/link';
import { BusFront, CheckCircle2 } from 'lucide-react';
import { AuthForm } from '@/components/AuthForm';

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ returnTo?: string }>;
}) {
  const { returnTo } = await searchParams;
  return (
    <div className="grid min-h-[calc(100vh-4.5rem)] bg-stone-50 lg:grid-cols-2">
      <section className="hidden bg-slate-950 p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <Link href="/" className="flex items-center gap-3 font-black">
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-red-700">
            <BusFront />
          </span>
          Siirt Kurtalan Ekspres
        </Link>
        <div>
          <p className="eyebrow !text-red-400">Yolculuğuna devam et</p>
          <h1 className="mt-4 max-w-xl text-5xl font-black leading-tight">
            Biletlerin, koltuğun ve canlı yolculuğun tek hesapta.
          </h1>
          <div className="mt-8 space-y-3 text-slate-300">
            {[
              'Güvenli yolcu oturumu',
              'Hızlı koltuk ve ödeme akışı',
              'Aktif biletle canlı takip',
            ].map((text) => (
              <p key={text} className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-red-400" />
                {text}
              </p>
            ))}
          </div>
        </div>
        <p className="text-xs text-slate-500">Şirket sunumu için yerel demo ortamı</p>
      </section>
      <section className="grid place-items-center px-4 py-12">
        <div className="w-full max-w-md">
          <Link href="/" className="text-sm font-bold text-red-700 lg:hidden">
            ← Ana sayfa
          </Link>
          <p className="eyebrow mt-6 lg:mt-0">Yolcu hesabı</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight">Tekrar hoş geldiniz</h1>
          <p className="mb-7 mt-2 text-sm leading-6 text-slate-600">
            Bilet işlemlerinize kaldığınız yerden güvenle devam edin.
          </p>
          <AuthForm mode="login" returnTo={returnTo} />
        </div>
      </section>
    </div>
  );
}
