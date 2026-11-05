import Link from 'next/link';
import { BusFront } from 'lucide-react';
import { getLocations, getTrips } from '@/lib/server-transport';
import { getSeatMap } from '@/lib/server-seats';
import { BackButton } from '@/components/nav/BackButton';
import {
  dateFromIso,
  formatDuration,
  formatTl,
  formatTime,
  isoDate,
  minutesBetween,
  placeShortName,
} from '@/lib/format';

export const metadata = { title: 'Sefer sonuçları' };
export const dynamic = 'force-dynamic';

type SearchResult = {
  trip: { id: string; departureTime: string; arrivalTime: string; basePrice: number };
  route: { originId: string; destinationId: string };
  bus: { seatLayout?: { layout?: string }; totalSeats?: number };
};

type Availability = { available: number; total: number } | null;

/** Live seat inventory per trip, from the public seat-map endpoint. */
async function loadAvailability(tripId: string): Promise<Availability> {
  try {
    const data = (await getSeatMap(tripId)) as { seats?: Array<{ status: string }> };
    const seats = data.seats ?? [];
    if (!seats.length) return null;
    return {
      available: seats.filter((seat) => seat.status === 'available').length,
      total: seats.length,
    };
  } catch {
    return null;
  }
}

const DAYS_IN_STRIP = 14;

/**
 * Trip list: a day strip under the route title, then one card per departure
 * that fades up in sequence. A card opens the seat map for that trip.
 */
export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ originId?: string; destinationId?: string; date?: string }>;
}) {
  const query = await searchParams;
  let results: SearchResult[] = [];
  let locations: Array<{ id: string; name: string }> = [];
  let failed = false;
  try {
    [results, locations] = (await Promise.all([
      getTrips({
        originId: query.originId,
        destinationId: query.destinationId,
        date: query.date,
      }),
      getLocations(),
    ])) as [SearchResult[], Array<{ id: string; name: string }>];
  } catch {
    failed = true;
  }

  const names = new Map(locations.map((location) => [location.id, location.name]));
  const origin = names.get(query.originId ?? '');
  const destination = names.get(query.destinationId ?? '');
  const title =
    origin && destination
      ? `${placeShortName(origin)} → ${placeShortName(destination)}`
      : 'Tüm seferler';
  const activeDate = query.date || isoDate(0);

  const sorted = [...results].sort(
    (a, b) => new Date(a.trip.departureTime).getTime() - new Date(b.trip.departureTime).getTime(),
  );
  const availability = await Promise.all(sorted.map((item) => loadAvailability(item.trip.id)));

  const dayHref = (value: string) => {
    const params = new URLSearchParams();
    if (query.originId) params.set('originId', query.originId);
    if (query.destinationId) params.set('destinationId', query.destinationId);
    params.set('date', value);
    return `/search?${params.toString()}`;
  };
  const today = isoDate(0);
  const strip = Array.from({ length: DAYS_IN_STRIP }, (_, index) => {
    const day = dateFromIso(today);
    day.setDate(day.getDate() + index);
    return { value: isoDate(index), day };
  });

  return (
    <div className="pb-8">
      <header className="sticky top-0 z-10 flex flex-col gap-3 bg-sk-bg px-4 pb-2.5 pt-3.5">
        <div className="flex items-center gap-3">
          <BackButton fallback="/" />
          <div className="flex min-w-0 flex-col gap-0.5">
            <h1 className="m-0 text-lg font-extrabold">{title}</h1>
            <span className="text-[13px] text-sk-ink2">
              {dateFromIso(activeDate).toLocaleDateString('tr-TR', {
                day: 'numeric',
                month: 'long',
                weekday: 'long',
              })}{' '}
              · 1 yolcu
            </span>
          </div>
        </div>
        <nav aria-label="Gün seç" className="scroll-x snap-none pb-0.5">
          {strip.map(({ value, day }) => {
            const on = value === activeDate;
            return (
              <Link
                key={value}
                href={dayHref(value)}
                replace
                scroll={false}
                aria-current={on ? 'date' : undefined}
                className={`flex h-[54px] w-[54px] flex-none flex-col items-center justify-center gap-px rounded-2xl border no-underline transition-colors duration-[240ms] ${
                  on
                    ? 'border-sk-dark bg-sk-dark text-white'
                    : 'border-sk-line bg-white text-sk-ink'
                }`}
              >
                <span className="text-[11px] font-bold opacity-80">
                  {day.toLocaleDateString('tr-TR', { weekday: 'short' })}
                </span>
                <span className="text-lg font-extrabold leading-[1.1]">{day.getDate()}</span>
              </Link>
            );
          })}
        </nav>
      </header>

      <div className="flex flex-col gap-3 px-4 pt-1.5">
        {failed ? (
          <p role="alert" className="surface m-0 p-5 text-[15px] text-sk-ink2">
            Seferler şu anda yüklenemedi. Biraz sonra tekrar dene.
          </p>
        ) : null}

        {!failed && !sorted.length ? (
          <div className="surface flex flex-col items-center gap-2 px-6 py-10 text-center">
            <span className="grid h-14 w-14 place-items-center rounded-full bg-sk-bg text-sk-ink3">
              <BusFront size={26} aria-hidden />
            </span>
            <h2 className="m-0 text-lg font-extrabold">Bu gün için sefer yok</h2>
            <p className="m-0 max-w-[260px] text-sm text-sk-ink2">
              Üstteki şeritten başka bir gün seçebilirsin.
            </p>
          </div>
        ) : null}

        {sorted.map((item, index) => {
          const seats = availability[index];
          const scarce = seats ? seats.available <= 6 : false;
          const total = seats?.total ?? item.bus.totalSeats;
          const departure = formatTime(item.trip.departureTime);
          return (
            <Link
              key={item.trip.id}
              href={`/trips/${item.trip.id}/seats`}
              aria-label={`${departure} seferi${seats ? `, ${seats.available} boş koltuk` : ''}, ${formatTl(item.trip.basePrice)}`}
              className="rise flex flex-col gap-[14px] rounded-3xl border border-sk-line bg-white px-4 pb-[14px] pt-4 text-inherit no-underline"
              style={{ '--i': index } as React.CSSProperties}
            >
              <span className="grid w-full grid-cols-[auto_1fr_auto] items-center gap-3">
                <span className="flex flex-col gap-0.5">
                  <span className="num-md text-[26px] leading-none">{departure}</span>
                  <span className="text-xs text-sk-ink2">
                    {origin ? placeShortName(origin) : 'Kalkış'}
                  </span>
                </span>
                <span className="flex flex-col items-center gap-1">
                  <span className="text-xs font-bold text-sk-ink2">
                    {formatDuration(minutesBetween(item.trip.departureTime, item.trip.arrivalTime))}
                  </span>
                  <span aria-hidden className="relative block h-2 w-full">
                    <span className="absolute left-1 right-1 top-[3px] border-t-2 border-dashed border-[#CFCFC9]" />
                    <span className="absolute left-0 top-0 h-2 w-2 rounded-full bg-sk-ink" />
                    <span className="absolute right-0 top-0 box-border h-2 w-2 rounded-full border-2 border-sk-brand bg-white" />
                  </span>
                  <span className="text-[11px] text-sk-ink3">Direkt</span>
                </span>
                <span className="flex flex-col items-end gap-0.5">
                  <span className="num-md text-[26px] leading-none">
                    {formatTime(item.trip.arrivalTime)}
                  </span>
                  <span className="text-xs text-sk-ink2">
                    {destination ? placeShortName(destination) : 'Varış'}
                  </span>
                </span>
              </span>
              <span aria-hidden className="h-px w-full bg-sk-hair" />
              <span className="flex w-full items-center justify-between gap-2">
                <span className="flex gap-1.5">
                  <span className="chip bg-sk-bg font-bold text-[#3F434B]">
                    {item.bus.seatLayout?.layout ?? '2+1'}
                    {total ? ` · ${total} koltuk` : ''}
                  </span>
                  {seats ? (
                    <span
                      className={`chip ${scarce ? 'bg-sk-tint text-sk-brandInk' : 'bg-sk-okBg text-sk-ok'}`}
                    >
                      {scarce ? `Son ${seats.available} koltuk` : `${seats.available} boş koltuk`}
                    </span>
                  ) : null}
                </span>
                <span className="text-[22px] font-extrabold">{formatTl(item.trip.basePrice)}</span>
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
