'use client';

import Link from 'next/link';
import { Check, ChevronRight, MapPin } from 'lucide-react';
import { DriverScreen, RouteProgress, TripSummary } from '@/features/driver/DriverUI';
import { useDriver } from '@/features/driver/DriverProvider';
import { stops } from '@/features/driver/demo';

export default function TripPage() {
  const { activeIndex, passengers, completed } = useDriver();
  return (
    <DriverScreen
      title="Yol boyunca, adım adım."
      eyebrow={completed ? 'Sefer tamamlandı' : 'Aktif sefer · SKE 061'}
    >
      <TripSummary />
      <RouteProgress />
      <ol className="space-y-3" aria-label="Güzergâh durakları">
        {stops.map((stop, index) => {
          const done = index < activeIndex;
          const active = index === activeIndex;
          return (
            <li key={stop.id} className="relative">
              <Link
                href={`/driver/durak/${stop.id}`}
                aria-current={active ? 'step' : undefined}
                className={`flex items-start gap-3 rounded-card p-4 shadow-card ${active ? 'bg-ink-900 text-white' : 'bg-white'}`}
              >
                <span
                  className={`grid h-12 w-12 shrink-0 place-items-center rounded-tile font-display text-lg font-bold ${active ? 'bg-amber-400 text-ink-900' : done ? 'bg-lime-200 text-ink-900' : 'bg-cream-200 text-ink-500'}`}
                >
                  {done ? (
                    <Check className="h-5 w-5" aria-hidden />
                  ) : active ? (
                    <MapPin className="h-5 w-5" aria-hidden />
                  ) : (
                    index + 1
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <span
                    className={`badge ${active ? 'badge-amber' : done ? 'badge-lime' : 'badge-muted'}`}
                  >
                    {done ? 'Tamamlandı' : active ? 'Sıradaki' : 'Bekleniyor'}
                  </span>
                  <h2 className="mt-2 font-display text-lg font-bold">{stop.name}</h2>
                  <p className={`mt-1 text-xs ${active ? 'text-sage-300' : 'text-ink-500'}`}>
                    Planlanan {stop.planned} · Tahmini {stop.estimated}
                  </p>
                  <p className={`mt-3 text-sm ${active ? 'text-sage-300' : 'text-ink-500'}`}>
                    {passengers.filter((p) => p.origin === stop.id).length} biniş ·{' '}
                    {
                      passengers.filter((p) => p.destination === stop.id && p.status !== 'missed')
                        .length
                    }{' '}
                    iniş
                  </p>
                </div>
                <ChevronRight className="mt-3 h-4 w-4 shrink-0" aria-hidden />
              </Link>
            </li>
          );
        })}
      </ol>
      <p className="subtle">
        Durak ayrıntısından yolcuları kontrol edebilir, sunumda sıradaki durağı değiştirebilirsin.
      </p>
    </DriverScreen>
  );
}
