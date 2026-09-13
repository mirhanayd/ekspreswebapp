'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import { BusFront, Check, MapPin } from 'lucide-react';
import { useDriver } from './DriverProvider';
import { stops, driver } from './demo';

const MapView = dynamic(() => import('@/app/trips/[id]/MapView'), {
  ssr: false,
  loading: () => (
    <div className="skeleton h-full w-full" role="status" aria-label="Harita yükleniyor" />
  ),
});

export function DriverMap() {
  const { activeIndex, sharing } = useDriver();
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    if (loaded || failed) return;
    const timer = window.setTimeout(() => setFailed(true), 8000);
    return () => window.clearTimeout(timer);
  }, [loaded, failed]);
  const [positionIndex, setPositionIndex] = useState(activeIndex);
  useEffect(() => {
    if (sharing) setPositionIndex(activeIndex);
  }, [activeIndex, sharing]);
  const target = stops[Math.min(positionIndex, stops.length - 1)];
  const previous = stops[Math.max(0, Math.min(positionIndex - 1, stops.length - 1))];
  const vehicle = {
    longitude: previous.longitude + (target.longitude - previous.longitude) * 0.72,
    latitude: previous.latitude + (target.latitude - previous.latitude) * 0.72,
    label: `${driver.plate} · Demo konum`,
  };
  return (
    <div className="card overflow-hidden">
      {failed ? (
        <div className="map-texture relative bg-sage-200 p-5">
          <p className="eyebrow">
            <MapPin className="h-4 w-4" aria-hidden />
            Güzergâh şeması
          </p>
          <ol className="relative mt-5 space-y-4 border-l-2 border-dashed border-ink-300 pl-5">
            {stops.map((stop, index) => (
              <li className="relative flex min-h-11 items-center gap-3" key={stop.id}>
                <span
                  className={`grid h-9 w-9 shrink-0 place-items-center rounded-full ${index === positionIndex ? 'bg-amber-400' : 'bg-white'}`}
                >
                  {index < positionIndex ? <Check className="h-4 w-4" aria-hidden /> : index + 1}
                </span>
                <span className="text-sm font-semibold">{stop.city}</span>
                {index === Math.min(positionIndex, 3) ? (
                  <BusFront
                    className="ml-auto h-5 w-5 text-signal-600"
                    aria-label="Otobüsün demo konumu"
                  />
                ) : null}
              </li>
            ))}
          </ol>
          <p className="caption mt-5">Harita yüklenemedi; durak şeması gösteriliyor.</p>
        </div>
      ) : (
        <div className="h-[22rem] bg-sage-200" role="region" aria-label="Otobüsün demo haritası">
          <MapView
            points={stops}
            vehicle={vehicle}
            onError={() => setFailed(true)}
            onLoad={() => setLoaded(true)}
          />
        </div>
      )}
      <div className="flex items-center justify-between gap-3 px-4 py-3">
        <span className="caption">{driver.plate} · Demo konum</span>
        {failed ? (
          <button
            type="button"
            className="min-h-11 text-xs font-semibold underline underline-offset-4"
            onClick={() => setFailed(false)}
          >
            Tekrar dene
          </button>
        ) : (
          <a
            className="text-[0.625rem] text-ink-500 underline"
            href="https://www.openstreetmap.org/copyright"
            target="_blank"
            rel="noreferrer"
          >
            © OpenStreetMap · © CARTO
          </a>
        )}
      </div>
    </div>
  );
}
