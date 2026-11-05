'use client';

import Image from 'next/image';
import Link from 'next/link';
import { ArrowDown, ArrowRight, ArrowUp } from 'lucide-react';
import type { DriverIdentity, Trip, TripSummary } from './DriverProvider';
import { formatTime, formatToday, shortName } from '@/lib/format';
import { stopCounts, type Person, type TripStop } from '@/lib/trip-model';
import { useNow } from '@/lib/use-now';

function departureChip(trip: Trip, now: number) {
  if (trip.status === 'in_transit' || trip.status === 'boarding') {
    return { text: trip.status === 'boarding' ? 'Yolcu alımı' : 'Sefer sürüyor', tone: 'live' };
  }
  if (trip.status === 'completed') return { text: 'Tamamlandı', tone: 'done' };
  if (!now) return { text: 'Planlandı', tone: 'plain' };
  const minutes = Math.round((new Date(trip.departureTime).getTime() - now) / 60_000);
  if (minutes <= 0) return { text: 'Kalkış saati geldi', tone: 'soon' };
  if (minutes < 60) return { text: `Kalkışa ${minutes} dk`, tone: 'soon' };
  if (minutes < 24 * 60) return { text: `Kalkışa ${Math.round(minutes / 60)} sa`, tone: 'plain' };
  return { text: `Kalkışa ${Math.round(minutes / 1440)} gün`, tone: 'plain' };
}

const ROW_STATUS: Record<string, { text: string; tone: string }> = {
  scheduled: { text: 'Planlandı', tone: 'plain' },
  boarding: { text: 'Yolcu alımı', tone: 'live' },
  in_transit: { text: 'Sürüyor', tone: 'live' },
  completed: { text: 'Tamamlandı', tone: 'done' },
  cancelled: { text: 'İptal', tone: 'plain' },
};

export function TodayScreen({
  visible,
  driver,
  trip,
  trips,
  stops,
  people,
  stopIndex,
  onEnter,
  onSelect,
}: {
  visible: boolean;
  driver: DriverIdentity | null;
  trip: Trip | null;
  trips: TripSummary[];
  stops: TripStop[];
  people: Person[];
  stopIndex: number;
  onEnter: () => void;
  onSelect: (tripId: string) => void;
}) {
  const now = useNow();
  const initials = driver
    ? `${driver.firstName.charAt(0)}${driver.lastName.charAt(0)}`.toLocaleUpperCase('tr-TR')
    : 'Ş';
  const started = trip?.status === 'boarding' || trip?.status === 'in_transit';
  const chip = trip ? departureChip(trip, now) : null;
  const span = Math.max(1, stops.length - 1);
  const done = trip?.status === 'completed' ? span : started ? stopIndex : 0;
  const today = now ? new Date(now).toDateString() : null;
  const todayTrips = trips.filter((item) =>
    today
      ? new Date(item.departureTime).toDateString() === today || item.id === trip?.id
      : item.id === trip?.id,
  );

  return (
    <section className="today" data-on={visible} aria-hidden={!visible} aria-label="Bugün">
      <header className="today-top">
        <Image
          src="/brand/logo.png"
          alt="Siirt Kurtalan Ekspres"
          width={126}
          height={34}
          className="logo"
          priority
        />
        <Link
          href="/profile"
          className="avatar"
          aria-label={`Profil: ${driver?.firstName ?? 'Şoför'}`}
        >
          {initials}
          <i aria-hidden />
        </Link>
      </header>

      <div className="greeting">
        <span>{now ? formatToday(now) : ' '}</span>
        <h1>İyi günler{driver ? `, ${driver.firstName}` : ''}</h1>
      </div>

      {trip ? (
        <article className="next-trip">
          <div className="next-trip-head">
            <span className="eyebrow">{started ? 'Aktif sefer' : 'Sıradaki sefer'}</span>
            {chip ? (
              <span className="status" data-tone={chip.tone}>
                <i aria-hidden />
                {chip.text}
              </span>
            ) : null}
          </div>
          <div className="next-trip-main">
            <div>
              <strong className="clock">{formatTime(trip.departureTime)}</strong>
              <span>
                {shortName(trip.route.origin.name)} → {shortName(trip.route.destination.name)}
              </span>
            </div>
            <Image
              src="/brand/coach.jpg"
              alt={`Atanan otobüs, ${trip.bus.plateNumber}`}
              width={96}
              height={60}
              className="coach"
            />
          </div>

          <div
            className="rail"
            style={{ gridTemplateColumns: `repeat(${stops.length}, minmax(0, 1fr))` }}
          >
            <span
              aria-hidden
              className="rail-line"
              style={{ left: `${50 / stops.length}%`, right: `${50 / stops.length}%` }}
            />
            <span
              aria-hidden
              className="rail-fill"
              style={{
                left: `${50 / stops.length}%`,
                width: `${((100 - 100 / stops.length) * done) / span}%`,
              }}
            />
            {stops.map((stop) => {
              const counts = stopCounts(people, stop.index);
              const passed = started && stop.index < stopIndex;
              const current = started && stop.index === stopIndex;
              const down = passed ? counts.downDone : counts.down;
              const up = passed ? counts.upDone : counts.up;
              return (
                <div key={stop.id} className="rail-stop">
                  <i data-state={passed ? 'passed' : current ? 'current' : 'ahead'} aria-hidden />
                  <b>{stop.short}</b>
                  <small>{formatTime(stop.time)}</small>
                  <span className="rail-counts" data-passed={passed}>
                    {down > 0 ? (
                      <span data-tone="down" aria-label={`${down} inecek`}>
                        <ArrowDown size={11} strokeWidth={3.4} aria-hidden />
                        {down}
                      </span>
                    ) : null}
                    {up > 0 ? (
                      <span data-tone="up" aria-label={`${up} binecek`}>
                        <ArrowUp size={11} strokeWidth={3.4} aria-hidden />
                        {up}
                      </span>
                    ) : null}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="tags">
            <span className="plate">
              <i>TR</i>
              <b>{trip.bus.plateNumber}</b>
            </span>
            <span className="tag">
              {trip.bus.totalSeats ?? trip.manifest.length} koltuk ·{' '}
              {trip.bus.seatLayout?.layout ?? '2+1'}
            </span>
          </div>
        </article>
      ) : (
        <article className="next-trip empty-trip">
          <h2>Sana atanmış sefer yok</h2>
          <p>Yeni bir sefer atandığında burada görünecek.</p>
        </article>
      )}

      {trip ? (
        <button
          type="button"
          className="cta"
          disabled={trip.status === 'completed' || trip.status === 'cancelled'}
          onClick={onEnter}
        >
          <span>
            {trip.status === 'completed'
              ? 'Sefer tamamlandı'
              : started
                ? 'Sefere dön'
                : 'Yolcu alımını başlat'}
          </span>
          <ArrowRight size={22} strokeWidth={2.4} aria-hidden />
        </button>
      ) : null}

      {todayTrips.length ? (
        <section className="today-list" aria-label="Bugünkü seferler">
          <h2 className="eyebrow">Bugünkü seferlerin</h2>
          {todayTrips.map((item) => {
            const status = ROW_STATUS[item.status] ?? { text: item.status, tone: 'plain' };
            return (
              <button
                key={item.id}
                type="button"
                className="trip-row"
                aria-current={item.id === trip?.id}
                onClick={() => onSelect(item.id)}
              >
                <strong className="num-md">{formatTime(item.departureTime)}</strong>
                <span>
                  <b>
                    {shortName(item.route.origin.name)} → {shortName(item.route.destination.name)}
                  </b>
                  <small>
                    {item.bus.plateNumber} · {item.passengerSummary.total} yolcu
                  </small>
                </span>
                <em className="status" data-tone={status.tone}>
                  {status.text}
                </em>
              </button>
            );
          })}
        </section>
      ) : null}
    </section>
  );
}
