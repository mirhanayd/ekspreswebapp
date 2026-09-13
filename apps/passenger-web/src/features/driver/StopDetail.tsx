'use client';

import { Check, MapPin, Users } from 'lucide-react';
import { DriverScreen } from './DriverUI';
import { useDriver } from './DriverProvider';
import { PassengerCard } from './PassengerCard';
import { stops, type DriverStop } from './demo';

export function StopDetail({ stop }: { stop: DriverStop }) {
  const { passengers, activeIndex, selectStop } = useDriver();
  const index = stops.findIndex((item) => item.id === stop.id);
  const done = index < activeIndex;
  const active = index === activeIndex;
  const boarding = passengers.filter((p) => p.origin === stop.id);
  const alighting = passengers.filter((p) => p.destination === stop.id && p.status !== 'missed');
  return (
    <DriverScreen title={stop.name} eyebrow="Durak ayrıntısı" backHref="/driver/sefer">
      <section className="card overflow-hidden">
        <div className="p-5">
          <span className={`badge ${active ? 'badge-amber' : done ? 'badge-lime' : 'badge-muted'}`}>
            {done ? 'Tamamlandı' : active ? 'Sıradaki durak' : 'Bekleniyor'}
          </span>
          <dl className="mt-5 grid grid-cols-2 gap-4">
            <div>
              <dt className="caption">Planlanan varış</dt>
              <dd className="title-lg num mt-1">{stop.planned}</dd>
            </div>
            <div>
              <dt className="caption">Tahmini varış</dt>
              <dd className="title-lg num mt-1">{stop.estimated}</dd>
            </div>
          </dl>
        </div>
        <dl className="facts-strip facts-strip-soft">
          <div className="fact">
            <dt className="fact-label">Biniş listesi</dt>
            <dd className="fact-value">{boarding.length} yolcu</dd>
          </div>
          <div className="fact">
            <dt className="fact-label">{done ? 'İniş listesi' : 'İnecek'}</dt>
            <dd className="fact-value">{alighting.length} yolcu</dd>
          </div>
          <div className="fact">
            <dt className="fact-label">Bekleyen</dt>
            <dd className="fact-value">
              {boarding.filter((p) => p.status === 'waiting').length} yolcu
            </dd>
          </div>
        </dl>
      </section>
      <button
        type="button"
        className="btn btn-primary w-full"
        onClick={() => selectStop(active ? index + 1 : index)}
      >
        {active ? (
          <Check className="h-4 w-4" aria-hidden />
        ) : (
          <MapPin className="h-4 w-4" aria-hidden />
        )}
        {active
          ? index === stops.length - 1
            ? 'Seferi tamamla'
            : 'Durağı tamamla ve ilerle'
          : 'Bu durağı sıradaki yap'}
      </button>
      <div>
        <h2 className="title-md">Bu duraktan binecek yolcular</h2>
        <p className="subtle mt-1">Biniş durumlarını yolcu kartından güncelle.</p>
      </div>
      {boarding.length ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {boarding.map((p) => (
            <PassengerCard key={p.id} passenger={p} />
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <Users className="h-8 w-8 text-ink-400" aria-hidden />
          <p className="title-md mt-4">Bu durakta biniş yok</p>
          <p className="subtle mt-2">Seferin son durağına ulaşılıyor.</p>
        </div>
      )}
      {alighting.length ? (
        <section className="card card-pad">
          <h2 className="title-md">Bu durakta inişi olanlar</h2>
          <ul className="mt-3 divide-y divide-ink-900/10">
            {alighting.map((p) => (
              <li className="flex items-center justify-between gap-3 py-3 text-sm" key={p.id}>
                <span>{p.name}</span>
                <span className="badge badge-muted">Koltuk {p.seat}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </DriverScreen>
  );
}
