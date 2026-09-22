import Link from 'next/link';
import { ArrowLeft, BusFront, SlidersHorizontal, Sunrise, Sunset, Sun } from 'lucide-react';
import { getLocations, getTrips } from '@/lib/server-transport';
import { getSeatMap } from '@/lib/server-seats';
import type { SearchLocation } from '@/components/SearchPanel';
import { JourneySearchBar } from '@/components/JourneySearchBar';
import { JourneyCard } from '@/components/JourneyCard';
import { dateFromIso, formatDuration, isoDate, minutesBetween } from '@/lib/format';

export const metadata = { title: 'Sefer sonuçları' };

type SearchResult = {
  trip: {
    id: string;
    departureTime: string;
    arrivalTime: string;
    basePrice: number;
    status: string;
  };
  route: { name: string; originId: string; destinationId: string };
  bus: {
    model: string | null;
    plateNumber: string;
    seatLayout: { layout?: string };
    totalSeats?: number;
  };
};

type Availability = { available: number; total: number } | null;

const timeFilters = [
  { key: 'sabah', label: 'Sabah', icon: Sunrise, from: 0, to: 12 },
  { key: 'oglen', label: 'Öğleden sonra', icon: Sun, from: 12, to: 18 },
  { key: 'aksam', label: 'Akşam', icon: Sunset, from: 18, to: 24 },
] as const;

function buildHref(base: Record<string, string | undefined>, patch: Record<string, string | null>) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries({ ...base, ...patch })) {
    if (value) params.set(key, value);
  }
  const query = params.toString();
  return query ? `/search?${query}` : '/search';
}

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

/**
 * Search results — `ui/trip-search-reference.png`.
 *
 * Circular back control beside a segmented trip-type pill, a tinted route panel
 * with a dashed path and its own action row, a chip rail, a five-day date strip
 * with the selected day filled lime, then the result count paired with a
 * circular filter control and the rail-and-facts journey cards.
 */
export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{
    originId?: string;
    destinationId?: string;
    date?: string;
    sort?: string;
    time?: string;
  }>;
}) {
  const query = await searchParams;
  let results: SearchResult[] = [];
  let locations: SearchLocation[] = [];
  let error: string | null = null;
  try {
    [results, locations] = await Promise.all([
      getTrips({
        originId: query.originId,
        destinationId: query.destinationId,
        date: query.date,
      }),
      getLocations(),
    ]);
  } catch (caught) {
    error = caught instanceof Error ? caught.message : 'Seferler yüklenemedi.';
  }

  const names = new Map(locations.map((location) => [location.id, location.name]));
  const origin = names.get(query.originId || '') || 'Tüm kalkışlar';
  const destination = names.get(query.destinationId || '') || 'Tüm varışlar';
  const activeDate = query.date || isoDate(0);

  const activeTimeFilter = timeFilters.find((filter) => filter.key === query.time);
  const filtered = activeTimeFilter
    ? results.filter((item) => {
        const hour = new Date(item.trip.departureTime).getHours();
        return hour >= activeTimeFilter.from && hour < activeTimeFilter.to;
      })
    : results;

  const sorted = [...filtered].sort((a, b) =>
    query.sort === 'fiyat'
      ? a.trip.basePrice - b.trip.basePrice ||
        new Date(a.trip.departureTime).getTime() - new Date(b.trip.departureTime).getTime()
      : new Date(a.trip.departureTime).getTime() - new Date(b.trip.departureTime).getTime(),
  );

  const availability = await Promise.all(sorted.map((item) => loadAvailability(item.trip.id)));
  const cheapest = sorted.length ? Math.min(...sorted.map((item) => item.trip.basePrice)) : 0;

  const baseParams = {
    originId: query.originId,
    destinationId: query.destinationId,
    date: activeDate,
    sort: query.sort,
    time: query.time,
  };

  const dayStrip = Array.from({ length: 5 }, (_, index) => {
    const day = dateFromIso(activeDate);
    day.setDate(day.getDate() + index - 2);
    const value = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(
      day.getDate(),
    ).padStart(2, '0')}`;
    return { value, date: day, disabled: value < isoDate(0) };
  });

  return (
    <div className="canvas-cream min-h-[100dvh]">
      <div className="screen screen-pad">
        {/* Back + trip type -------------------------------------------- */}
        <div className="top-row">
          <Link href="/" aria-label="Ana sayfaya dön" className="icon-btn icon-btn-white">
            <ArrowLeft className="h-5 w-5" aria-hidden />
          </Link>

          <nav aria-label="Sıralama" className="segmented">
            <Link
              href={buildHref(baseParams, { sort: 'saat' })}
              aria-current={(query.sort || 'saat') === 'saat' ? 'true' : undefined}
              className={`segmented-item ${
                (query.sort || 'saat') === 'saat' ? 'segmented-item-active' : ''
              }`}
            >
              En erken
            </Link>
            <Link
              href={buildHref(baseParams, { sort: 'fiyat' })}
              aria-current={query.sort === 'fiyat' ? 'true' : undefined}
              className={`segmented-item ${query.sort === 'fiyat' ? 'segmented-item-active' : ''}`}
            >
              En uygun
            </Link>
          </nav>
        </div>

        {/* Journey editor — the same bar as the home screen, always visible
            whether or not the locations endpoint answered. ---------------- */}
        <div className="mt-6">
          <JourneySearchBar
            locations={locations}
            defaultOriginId={query.originId ?? ''}
            defaultDestinationId={query.destinationId ?? ''}
            defaultDate={activeDate}
          />
        </div>

        {/* Date strip --------------------------------------------------- */}
        <nav aria-label="Tarih seçimi" className="mt-5">
          <ul className="flex justify-between gap-1.5 lg:justify-start lg:gap-3">
            {dayStrip.map(({ value, date, disabled }) => {
              const active = value === activeDate;
              return (
                <li key={value} className="min-w-0">
                  <Link
                    href={buildHref(baseParams, { date: value })}
                    aria-current={active ? 'date' : undefined}
                    className={`date-cell ${active ? 'date-cell-active' : ''} ${
                      disabled ? 'pointer-events-none opacity-40' : ''
                    }`}
                  >
                    <span className="text-[0.6875rem] font-semibold uppercase">
                      {date.toLocaleDateString('tr-TR', { weekday: 'narrow' })}
                    </span>
                    <span className="num font-display text-lg font-bold leading-none">
                      {date.getDate()}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Count + filters ---------------------------------------------- */}
        <details className="group mt-7" open={Boolean(activeTimeFilter)}>
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 [&::-webkit-details-marker]:hidden">
            <h1 className="title-lg">
              {sorted.length} sefer <span className="text-ink-400">bulundu</span>
            </h1>
            <span
              className="icon-btn icon-btn-white relative h-12 w-12"
              aria-label="Saat filtrelerini aç"
            >
              <SlidersHorizontal className="h-[1.125rem] w-[1.125rem]" aria-hidden />
              {activeTimeFilter ? (
                <span className="absolute right-2.5 top-2.5 h-2.5 w-2.5 rounded-full bg-signal-500 ring-2 ring-white" />
              ) : null}
            </span>
          </summary>

          <div className="rail-scroll mt-4">
            {timeFilters.map(({ key, label, icon: Icon }) => {
              const active = query.time === key;
              return (
                <Link
                  key={key}
                  href={buildHref(baseParams, { time: active ? null : key })}
                  aria-current={active ? 'true' : undefined}
                  className={`chip ${active ? 'chip-active' : ''}`}
                >
                  <Icon className="h-4 w-4" aria-hidden />
                  {label}
                </Link>
              );
            })}
          </div>
        </details>

        {/* Results ------------------------------------------------------ */}
        <div className="mt-4">
          {error ? (
            <p role="alert" className="alert-error">
              {error} API bağlantısını kontrol edip sayfayı yenileyin.
            </p>
          ) : !sorted.length ? (
            <div className="empty-state">
              <span className="grid h-16 w-16 place-items-center rounded-full bg-cream-300 text-ink-400">
                <BusFront className="h-7 w-7" aria-hidden />
              </span>
              <h2 className="title-md mt-4">Bu seçimde sefer yok</h2>
              <p className="subtle mt-2 max-w-xs">
                {activeTimeFilter
                  ? 'Saat filtresini kaldırarak ya da tarihi değiştirerek tekrar deneyin.'
                  : 'Tarihi veya terminal seçimini değiştirerek tekrar deneyin.'}
              </p>
              {activeTimeFilter ? (
                <Link href={buildHref(baseParams, { time: null })} className="btn btn-quiet mt-6">
                  Saat filtresini kaldır
                </Link>
              ) : null}
            </div>
          ) : (
            <ul className="grid gap-4 lg:grid-cols-2">
              {sorted.map(({ trip, route, bus }, index) => {
                const seats = availability[index];
                const originName = names.get(route.originId) || origin;
                const destinationName = names.get(route.destinationId) || destination;
                return (
                  <li key={trip.id} className="min-w-0">
                    <JourneyCard
                      href={`/trips/${trip.id}`}
                      originName={originName}
                      destinationName={destinationName}
                      departureTime={trip.departureTime}
                      arrivalTime={trip.arrivalTime}
                      price={trip.basePrice}
                      badge={
                        sorted.length > 1 && trip.basePrice === cheapest
                          ? 'En uygun fiyat'
                          : undefined
                      }
                      facts={[
                        {
                          label: 'Süre',
                          value: formatDuration(
                            minutesBetween(trip.departureTime, trip.arrivalTime),
                          ),
                        },
                        { label: 'Araç', value: bus.plateNumber },
                        { label: 'Boş koltuk', value: seats ? `${seats.available}` : '—' },
                      ]}
                    />
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
