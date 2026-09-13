'use client';

import Link from 'next/link';
import { ArrowRight, BusFront, Check, Clock3, MapPin, Users } from 'lucide-react';
import { useDriver } from '@/features/driver/DriverProvider';
import { RouteProgress, SharingCard, TripSummary } from '@/features/driver/DriverUI';
import { driver } from '@/features/driver/demo';

export default function DriverHome() {
  const { nextStop, completed, passengers, counts } = useDriver();
  const waitingHere = passengers.filter(
    (p) => p.origin === nextStop?.id && p.status === 'waiting',
  ).length;
  return (
    <div className="canvas-sage min-h-[100dvh]">
      <div className="screen screen-pad">
        <div className="top-row">
          <div>
            <p className="font-display text-[1.375rem] font-bold">Merhaba, Mehmet</p>
            <p className="caption mt-1">İyi yolculuklar.</p>
          </div>
          <Link
            href="/driver/profil"
            className="icon-btn icon-btn-white"
            aria-label="Şoför profili"
          >
            <BusFront className="h-6 w-6" aria-hidden />
          </Link>
        </div>
        <div className="mt-8 flex items-center justify-between gap-3">
          <p className="eyebrow">Siirt Kurtalan Ekspres</p>
          <span className="badge badge-muted">Demo</span>
        </div>
        <h1 className="display-1 mt-2">
          Yolun
          <br />
          kontrolü sende.
        </h1>
        <div className="rail-scroll mt-5">
          <Link href="/driver/sefer" className="chip chip-active">
            <BusFront className="h-4 w-4" aria-hidden />
            {completed ? 'Tamamlanan sefer' : 'Aktif sefer'}
          </Link>
          <Link href="/driver/profil" className="chip">
            {driver.plate}
          </Link>
        </div>
        <div className="mt-6">
          <TripSummary />
        </div>
        <section className="panel-dark mt-5 p-5" aria-label="Sıradaki durak">
          <div className="flex items-center justify-between gap-2">
            <p className="flex items-center gap-2 text-xs font-semibold text-sage-300">
              <MapPin className="h-4 w-4" aria-hidden />
              {completed ? 'Yolculuk tamamlandı' : 'Sıradaki durak'}
            </p>
            {nextStop ? (
              <span className="duration-pill">
                <Clock3 className="h-3.5 w-3.5" aria-hidden />
                {nextStop.eta} dk
              </span>
            ) : (
              <Check className="h-5 w-5 text-lime-400" aria-hidden />
            )}
          </div>
          <h2 className="mt-4 font-display text-[1.75rem] font-bold tracking-tight">
            {nextStop?.name ?? 'Erzurum’a ulaştınız'}
          </h2>
          <p className="mt-2 text-sm text-sage-300">
            {nextStop
              ? `${nextStop.estimated} tahmini varış · ${waitingHere} yolcu bekleniyor`
              : 'Sefer özeti ve yolcu kayıtları hazır.'}
          </p>
          <Link
            href={nextStop ? `/driver/durak/${nextStop.id}` : '/driver/sefer'}
            className="btn btn-outline-invert mt-5 w-full"
          >
            {nextStop ? 'Durak ve yolcular' : 'Seferi görüntüle'}
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </section>
        <section className="card mt-5 overflow-hidden" aria-label="Yolcu özeti">
          <div className="flex items-center justify-between gap-2 p-5">
            <h2 className="title-md flex items-center gap-2">
              <Users className="h-5 w-5" aria-hidden />
              Yolcular
            </h2>
            <Link
              href="/driver/yolcular"
              className="inline-flex min-h-11 items-center gap-1 text-sm font-semibold"
            >
              Tümünü gör
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </div>
          <p className="px-5 pb-4 text-sm text-ink-500">
            <strong className="num font-display text-2xl text-ink-900">
              {counts.boarded} / {counts.total}
            </strong>{' '}
            yolcu bindi
          </p>
          <dl className="facts-strip facts-strip-soft">
            {[
              { label: 'Bindi', value: counts.boarded },
              { label: 'Bekleyen', value: counts.waiting },
              { label: 'Binmedi', value: counts.missed },
            ].map((item) => (
              <div className="fact" key={item.label}>
                <dt className="fact-label">{item.label}</dt>
                <dd className="fact-value num">{item.value}</dd>
              </div>
            ))}
          </dl>
        </section>
        <div className="my-6">
          <RouteProgress />
        </div>
        <SharingCard />
      </div>
    </div>
  );
}
