'use client';

import Link from 'next/link';
import { ArrowRight, Radio } from 'lucide-react';
import { ScreenHeader } from '@/components/ScreenHeader';
import { RoutePanel } from '@/components/RoutePanel';
import { useDriver } from './DriverProvider';
import { driver } from './demo';

export function DriverScreen({
  title,
  eyebrow,
  backHref = '/driver',
  children,
  sage = false,
}: {
  title: string;
  eyebrow: string;
  backHref?: string;
  children: React.ReactNode;
  sage?: boolean;
}) {
  return (
    <div className={`${sage ? 'canvas-sage' : 'canvas-cream'} min-h-[100dvh]`}>
      <div className="screen screen-pad">
        <ScreenHeader
          backHref={backHref}
          title="Şoför"
          action={<span className="badge badge-muted">Demo</span>}
        />
        <p className="eyebrow mt-7">{eyebrow}</p>
        <h1 className="title-lg mt-2">{title}</h1>
        <div className="mt-6 space-y-5">{children}</div>
      </div>
    </div>
  );
}

export function TripSummary() {
  return (
    <RoutePanel originName="Trabzon Otogar" destinationName="Erzurum Otogar">
      <dl className="flex justify-between gap-4 border-t border-ink-900/10 pt-4">
        <div>
          <dt className="caption">Kalkış</dt>
          <dd className="num title-md mt-1">09:00</dd>
        </div>
        <div className="text-right">
          <dt className="caption">Tahmini varış</dt>
          <dd className="num title-md mt-1">14:00</dd>
        </div>
      </dl>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
        <span className="badge badge-ink">{driver.plate}</span>
        <span className="caption">{driver.trip}</span>
      </div>
    </RoutePanel>
  );
}

export function RouteProgress() {
  const { progress, completed } = useDriver();
  return (
    <div>
      <div className="mb-2 flex justify-between gap-2 text-xs font-semibold text-ink-600">
        <span>{completed ? 'Sefer tamamlandı' : 'Güzergâh ilerlemesi'}</span>
        <span className="num">%{progress}</span>
      </div>
      <div
        className="meter"
        role="progressbar"
        aria-label="Güzergâh ilerlemesi"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={progress}
      >
        <span className="meter-fill" style={{ width: `${progress}%` }} />
      </div>
    </div>
  );
}

export function SharingCard({ controls = false }: { controls?: boolean }) {
  const { sharing, toggleSharing, age } = useDriver();
  return (
    <section className="card card-pad" aria-label="Konum paylaşımı">
      <div className="flex items-center gap-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-sage-200">
          <Radio className="h-5 w-5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-bold">Konum paylaşımı</h2>
          <p className="caption mt-1">Son güncelleme {age} sn önce</p>
        </div>
        <span className={`badge ${sharing ? 'badge-lime' : 'badge-muted'}`}>
          <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden />
          {sharing ? 'Aktif' : 'Kapalı'}
        </span>
      </div>
      <p className="subtle mt-3">
        {sharing
          ? 'Yolcular otobüsünüzü canlı takip ekranında görebiliyor.'
          : 'Konum paylaşımı duraklatıldı. Yolcular son paylaşılan konumu görüyor.'}
      </p>
      <p className="caption mt-2">Demo gösterimi · Konum simüle edilir.</p>
      {controls ? (
        <button
          type="button"
          role="switch"
          aria-checked={sharing}
          aria-label="Konum paylaşımı"
          onClick={toggleSharing}
          className="btn btn-ghost mt-4 w-full"
        >
          {sharing ? 'Paylaşımı duraklat' : 'Paylaşımı aç'}
        </button>
      ) : (
        <Link
          href="/driver/konum"
          className="mt-3 inline-flex min-h-11 items-center gap-2 text-sm font-semibold"
        >
          Konumu görüntüle <ArrowRight className="h-4 w-4" aria-hidden />
        </Link>
      )}
    </section>
  );
}
