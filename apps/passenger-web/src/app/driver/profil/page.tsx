'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useCallback, useState } from 'react';
import { ArrowUpRight, BusFront, Phone, RotateCcw, UserRound } from 'lucide-react';
import { BrandMark } from '@/components/BrandLogo';
import { Sheet } from '@/components/Sheet';
import { DriverScreen, TripSummary } from '@/features/driver/DriverUI';
import { useDriver } from '@/features/driver/DriverProvider';
import { driver } from '@/features/driver/demo';

export default function ProfilePage() {
  const { reset } = useDriver();
  const [confirm, setConfirm] = useState(false);
  const [notice, setNotice] = useState('');
  const close = useCallback(() => setConfirm(false), []);
  return (
    <DriverScreen title="İyi yolculuklar, kaptan." eyebrow="Profil ve araç" sage>
      <section className="card card-pad flex items-center gap-4">
        <span className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-lime-400">
          <UserRound className="h-6 w-6" aria-hidden />
        </span>
        <div>
          <h2 className="title-md">{driver.name}</h2>
          <p className="caption mt-1">Siirt Kurtalan Ekspres · Şoför</p>
          <p className="mt-2 flex items-center gap-2 text-sm text-ink-600">
            <Phone className="h-3.5 w-3.5" aria-hidden />
            {driver.phone}
          </p>
        </div>
      </section>
      <figure className="relative overflow-hidden rounded-[2rem] bg-ink-900 shadow-lift">
        <Image
          src="/brand/coach.jpg"
          alt="Siirt Kurtalan Ekspres filosundan otobüs"
          fill
          sizes="(max-width: 1024px) 100vw, 720px"
          className="object-cover object-center"
        />
        <div className="absolute inset-0 bg-hero-scrim" aria-hidden />
        <figcaption className="relative flex min-h-64 flex-col justify-end p-6 text-white">
          <span className="mb-3 inline-flex">
            <span className="badge badge-lime">{driver.plate}</span>
          </span>
          <h2 className="font-display text-xl font-bold">{driver.vehicle}</h2>
          <p className="mt-2 flex items-center gap-2 text-sm text-white/80">
            <BusFront className="h-4 w-4" aria-hidden />
            2+1 koltuk düzeni · Şehirlerarası
          </p>
        </figcaption>
      </figure>
      <TripSummary />
      <section className="card card-pad">
        <BrandMark className="w-40" />
        <p className="subtle mt-4">
          Siirt Kurtalan Ekspres şoför uygulaması. Yolcu deneyimiyle aynı yolun parçası.
        </p>
        <Link href="/" className="btn btn-ghost mt-4 w-full">
          Yolcu uygulamasını aç
          <ArrowUpRight className="h-4 w-4" aria-hidden />
        </Link>
      </section>
      <button className="btn btn-ghost w-full" type="button" onClick={() => setConfirm(true)}>
        <RotateCcw className="h-4 w-4" aria-hidden />
        Demoyu başlangıca al
      </button>
      <p className="caption">
        Demo verileri kullanılır. Sayfa yenilenince başlangıç senaryosu yüklenir.
      </p>
      <p className="text-sm font-semibold text-ink-600" role="status">
        {notice}
      </p>
      <Sheet open={confirm} onClose={close} title="Demoyu başlangıca al">
        <p className="subtle">
          Yolcu durumları, sıradaki durak ve konum paylaşımı ilk sunum senaryosuna dönecek.
        </p>
        <button
          type="button"
          onClick={() => {
            reset();
            close();
            setNotice('Demo başlangıç senaryosuna alındı.');
          }}
          className="btn btn-primary mt-5 w-full"
        >
          Sıfırla
        </button>
        <button type="button" onClick={close} className="btn btn-ghost mt-2 w-full">
          Vazgeç
        </button>
      </Sheet>
    </DriverScreen>
  );
}
