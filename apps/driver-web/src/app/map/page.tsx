'use client';

import { Check, MapPinCheck, Phone, TriangleAlert } from 'lucide-react';
import { DriverMap } from '@/components/DriverMap';
import { useDriver } from '@/components/DriverProvider';
import {
  Alerts,
  DriverPageShell,
  formatTime,
  OPERATIONS_PHONE,
  stopTime,
  useNow,
} from '@/components/DriverUI';

export default function DriverRoutePage() {
  return (
    <DriverPageShell flush>
      <DriverRouteContent />
    </DriverPageShell>
  );
}

function etaText(target: Date, now: number) {
  const minutes = Math.round((target.getTime() - now) / 60_000);
  if (minutes > 0) return `${minutes} dk`;
  if (minutes === 0) return 'Şimdi';
  return `${Math.abs(minutes)} dk gecikme`;
}

function DriverRouteContent() {
  const { trip, counts, sharing, latestPosition, nextStop, arrivedStopIds, markStopArrived } =
    useDriver();
  const now = useNow();
  if (!trip) return null;

  const stops = [...trip.route.stops].sort((a, b) => a.stopOrder - b.stopOrder);
  const nextTime = nextStop ? stopTime(trip, nextStop.estimatedMinutesFromStart) : null;
  const speed = sharing && latestPosition ? Math.round(latestPosition.speedKph) : null;
  const report = OPERATIONS_PHONE
    ? `sms:${OPERATIONS_PHONE}?body=${encodeURIComponent(
        `Sefer ${trip.bus.plateNumber} ${trip.route.origin.name}-${trip.route.destination.name}: `,
      )}`
    : '';

  return (
    <div className="route-screen">
      <div className="route-map">
        <DriverMap
          geometry={trip.route.geometry}
          stops={trip.route.stops}
          position={latestPosition}
        />
        <span className={`online-badge gps-badge ${sharing ? '' : 'offline'}`} role="status">
          <i aria-hidden />
          {sharing ? 'GPS açık' : 'GPS kapalı'}
        </span>
        <div
          className="speed-badge"
          aria-label={speed === null ? 'Hız bilinmiyor' : `${speed} km/sa`}
        >
          <strong>{speed ?? '—'}</strong>
          <span>km/sa</span>
        </div>
      </div>

      <div className="route-panel">
        <Alerts />
        <section className="next-stop" aria-label="Sonraki durak">
          <div>
            <p className="eyebrow">Sonraki durak</p>
            <h2>{nextStop ? nextStop.location.name : 'Tüm duraklar tamamlandı'}</h2>
          </div>
          {nextTime ? (
            <div className="eta">
              <strong>{etaText(nextTime, now)}</strong>
              <span>Plan {formatTime(nextTime)}</span>
            </div>
          ) : null}
        </section>

        <dl className="facts">
          <div className="fact">
            <dt>Araçtaki yolcu</dt>
            <dd>{counts.boarded}</dd>
          </div>
          <div className="fact">
            <dt>Kalkış</dt>
            <dd>{formatTime(trip.departureTime)}</dd>
          </div>
          <div className="fact">
            <dt>Varış</dt>
            <dd>{formatTime(trip.arrivalTime)}</dd>
          </div>
        </dl>

        <section className="card" aria-label="Durak zaman çizelgesi">
          <ol className="timeline">
            {stops.map((stop) => {
              const done = arrivedStopIds.has(stop.id);
              const current = stop.id === nextStop?.id;
              return (
                <li
                  key={stop.id}
                  className={done ? 'done' : current ? 'current' : ''}
                  aria-current={current ? 'step' : undefined}
                >
                  <span className="dot" aria-hidden>
                    {done ? <Check /> : null}
                  </span>
                  <div>
                    <strong>{stop.location.name}</strong>
                    <small>{done ? 'Varıldı' : `${stop.passengers.length} binecek`}</small>
                  </div>
                  <time>{formatTime(stopTime(trip, stop.estimatedMinutesFromStart))}</time>
                </li>
              );
            })}
          </ol>
        </section>

        <div className="btn-row">
          {OPERATIONS_PHONE ? (
            <a className="btn btn-secondary btn-lg" href={`tel:${OPERATIONS_PHONE}`}>
              <Phone aria-hidden />
              Ara
            </a>
          ) : (
            <button
              type="button"
              className="btn btn-secondary btn-lg"
              disabled
              title="Operasyon numarası tanımlı değil"
            >
              <Phone aria-hidden />
              Ara
            </button>
          )}
          {report ? (
            <a className="btn btn-secondary btn-lg" href={report}>
              <TriangleAlert aria-hidden />
              Sorun bildir
            </a>
          ) : (
            <button
              type="button"
              className="btn btn-secondary btn-lg"
              disabled
              title="Operasyon numarası tanımlı değil"
            >
              <TriangleAlert aria-hidden />
              Sorun bildir
            </button>
          )}
        </div>
        <button
          type="button"
          className="btn btn-primary btn-lg"
          disabled={!nextStop}
          onClick={() => nextStop && markStopArrived(nextStop.id)}
        >
          <MapPinCheck aria-hidden />
          Durağa vardım
        </button>
        <p className="muted" style={{ fontSize: '0.8rem' }}>
          Durak varışları bu cihazda tutulur; yolcu durumları sunucuya kaydedilir.
        </p>
      </div>
    </div>
  );
}
