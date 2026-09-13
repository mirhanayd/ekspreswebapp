'use client';

import Link from 'next/link';
import { ArrowRight, Clock3 } from 'lucide-react';
import { DriverScreen, RouteProgress, SharingCard } from '@/features/driver/DriverUI';
import { DriverMap } from '@/features/driver/DriverMap';
import { useDriver } from '@/features/driver/DriverProvider';

export default function LocationPage() {
  const { nextStop, completed } = useDriver();
  return (
    <DriverScreen title="Yolcuların gözü yolda." eyebrow="Canlı konum" sage>
      <DriverMap />
      <section className="panel-dark p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold text-sage-300">
              {completed ? 'Son durak' : 'Sıradaki durak'}
            </p>
            <h2 className="mt-2 font-display text-xl font-bold">
              {nextStop?.name ?? 'Erzurum Otogar'}
            </h2>
          </div>
          {nextStop ? (
            <span className="duration-pill">
              <Clock3 className="h-4 w-4" aria-hidden />
              {nextStop.eta} dk
            </span>
          ) : (
            <span className="badge badge-lime">Tamamlandı</span>
          )}
        </div>
        <Link
          href={nextStop ? `/driver/durak/${nextStop.id}` : '/driver/sefer'}
          className="mt-4 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-white"
        >
          {nextStop ? `Tahmini varış ${nextStop.estimated}` : 'Sefer özeti'}
          <ArrowRight className="h-4 w-4" aria-hidden />
        </Link>
      </section>
      <RouteProgress />
      <SharingCard controls />
    </DriverScreen>
  );
}
