'use client';

import { ArrowRight, CirclePlay, Flag, Users } from 'lucide-react';
import { useDriver, type Trip } from './DriverProvider';
import {
  DriverPageShell,
  formatDate,
  formatTime,
  OnlineBadge,
  StatusChip,
  TicketCheckButton,
  useNow,
} from './DriverUI';

const steps = [
  { status: 'scheduled', label: 'Planlandı' },
  { status: 'boarding', label: 'Yolcu alımı' },
  { status: 'in_transit', label: 'Yolda' },
  { status: 'completed', label: 'Tamamlandı' },
];

function countdown(trip: Trip, now: number) {
  if (trip.status === 'in_transit') return 'Yolculuk sürüyor';
  if (trip.status === 'completed') return 'Sefer tamamlandı';
  if (trip.status === 'cancelled') return 'Sefer iptal edildi';
  const minutes = Math.round((new Date(trip.departureTime).getTime() - now) / 60_000);
  if (minutes > 120) return `Kalkışa ${Math.floor(minutes / 60)} sa ${minutes % 60} dk`;
  if (minutes > 0) return `Kalkışa ${minutes} dk`;
  if (minutes === 0) return 'Kalkış zamanı';
  return `Kalkış ${Math.abs(minutes)} dk geçti`;
}

function primaryAction(status: string) {
  if (status === 'scheduled')
    return { next: 'boarding', label: 'Yolcu alımını başlat', icon: Users };
  if (status === 'boarding')
    return { next: 'in_transit', label: 'Seferi başlat', icon: CirclePlay };
  if (status === 'in_transit') return { next: 'completed', label: 'Seferi tamamla', icon: Flag };
  return null;
}

export function DriverDashboard() {
  return (
    <DriverPageShell>
      <DriverHomeContent />
    </DriverPageShell>
  );
}

function DriverHomeContent() {
  const {
    driver,
    trip,
    counts,
    sharing,
    lastLocationAt,
    statusBusy,
    startLocationSharing,
    stopLocationSharing,
    setTripStatus,
  } = useDriver();
  const now = useNow();
  if (!trip) return null;

  const closed = trip.status === 'completed' || trip.status === 'cancelled';
  const stepIndex = steps.findIndex((step) => step.status === trip.status);
  const action = primaryAction(trip.status);
  const hour = new Date(now).getHours();
  const salute = hour < 12 ? 'Günaydın' : hour < 18 ? 'İyi günler' : 'İyi akşamlar';
  const bar = [
    { value: counts.boarded, color: 'var(--ok)' },
    { value: counts.pending, color: 'var(--warn)' },
    { value: counts.noShow, color: 'var(--danger)' },
  ].filter((item) => item.value > 0);

  return (
    <>
      <header className="greeting">
        <div>
          <p className="muted">{salute}</p>
          <h1>{driver ? driver.firstName : 'Sürücü'}</h1>
        </div>
        <OnlineBadge />
      </header>

      <section className="card next-trip" aria-label="Sıradaki sefer">
        <div className="next-trip-top">
          <span className="eyebrow">{closed ? 'Son sefer' : 'Sıradaki sefer'}</span>
          <StatusChip status={trip.status} />
        </div>
        <div>
          <p className="big-time">{formatTime(trip.departureTime)}</p>
          <p className="countdown">{countdown(trip, now)}</p>
        </div>
        <p className="route-line">
          {trip.route.origin.name}
          <ArrowRight aria-label="→" />
          {trip.route.destination.name}
        </p>
        <dl className="facts">
          <div className="fact">
            <dt>Plaka</dt>
            <dd className="mono">{trip.bus.plateNumber}</dd>
          </div>
          <div className="fact">
            <dt>Peron</dt>
            <dd>—</dd>
          </div>
          <div className="fact">
            <dt>Varış</dt>
            <dd>{formatTime(trip.arrivalTime)}</dd>
          </div>
        </dl>
        <ol className="steps" aria-label="Sefer durumu">
          {steps.map((step, index) => (
            <li
              key={step.status}
              className={index < stepIndex ? 'done' : index === stepIndex ? 'current' : ''}
              aria-current={index === stepIndex ? 'step' : undefined}
            >
              {step.label}
            </li>
          ))}
        </ol>
        <p className="muted" style={{ fontSize: '0.875rem' }}>
          {formatDate(trip.departureTime)} · {trip.route.name}
        </p>
      </section>

      <section className="card" aria-label="Yolcu özeti">
        <div className="counters">
          <div className="counter">
            <strong>{counts.total}</strong>
            <span>Toplam</span>
          </div>
          <div className="counter ok">
            <strong>{counts.boarded}</strong>
            <span>Bindi</span>
          </div>
          <div className="counter warn">
            <strong>{counts.pending}</strong>
            <span>Bekliyor</span>
          </div>
          <div className="counter bad">
            <strong>{counts.noShow}</strong>
            <span>Gelmedi</span>
          </div>
        </div>
        <div className="stack-bar" aria-hidden>
          {bar.map((item) => (
            <span
              key={item.color}
              style={{ width: `${(item.value / counts.total) * 100}%`, background: item.color }}
            />
          ))}
        </div>
      </section>

      <section className="card toggle-row">
        <div>
          <h2 id="share-label">Konum paylaşımı</h2>
          <p>
            {sharing
              ? lastLocationAt
                ? `Yolcular canlı görüyor · son gönderim ${formatTime(lastLocationAt)}`
                : 'GPS sinyali bekleniyor…'
              : closed
                ? 'Sefer kapalı'
                : 'Yalnızca bu seferin yolcularıyla paylaşılır'}
          </p>
        </div>
        <button
          type="button"
          role="switch"
          className="switch"
          aria-checked={sharing}
          aria-labelledby="share-label"
          disabled={!sharing && closed}
          onClick={sharing ? stopLocationSharing : startLocationSharing}
        />
      </section>

      <div className="page" style={{ gap: 10 }}>
        <TicketCheckButton />
        {action ? (
          <button
            type="button"
            className="btn btn-primary btn-lg"
            disabled={statusBusy}
            onClick={() => void setTripStatus(action.next)}
          >
            <action.icon aria-hidden />
            {statusBusy ? 'Güncelleniyor…' : action.label}
          </button>
        ) : null}
      </div>
    </>
  );
}
