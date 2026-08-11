import Link from 'next/link';
import {
  ArrowLeft,
  ArrowRight,
  BusFront,
  ChevronLeft,
  ChevronRight,
  Clock3,
  SlidersHorizontal,
  Sunrise,
  Sunset,
} from 'lucide-react';
import { API_BASE_URL } from '@/lib/server-api';
import { SearchPanel, type SearchLocation } from '@/components/SearchPanel';
import {
  dateFromIso,
  formatDuration,
  formatPrice,
  formatTime,
  isoDate,
  minutesBetween,
  placeShortName,
} from '@/lib/format';

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
  bus: { model: string; plateNumber: string; seatLayout: { layout?: string }; totalSeats?: number };
};

type Availability = { available: number; total: number } | null;

const sortOptions = [
  { key: 'saat', label: 'En erken' },
  { key: 'fiyat', label: 'En uygun' },
] as const;

const timeFilters = [
  { key: 'sabah', label: 'Sabah', hint: '00–12', icon: Sunrise, from: 0, to: 12 },
  { key: 'oglen', label: 'Öğleden sonra', hint: '12–18', icon: Clock3, from: 12, to: 18 },
  { key: 'aksam', label: 'Akşam', hint: '18–24', icon: Sunset, from: 18, to: 24 },
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
    const response = await fetch(`${API_BASE_URL}/seats/trip/${tripId}`, { cache: 'no-store' });
    if (!response.ok) return null;
    const data = (await response.json()) as { seats?: Array<{ status: string }> };
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
  const params = new URLSearchParams();
  if (query.originId) params.set('originId', query.originId);
  if (query.destinationId) params.set('destinationId', query.destinationId);
  if (query.date) params.set('date', query.date);

  let results: SearchResult[] = [];
  let locations: SearchLocation[] = [];
  let error: string | null = null;
  try {
    const [trips, points] = await Promise.all([
      fetch(`${API_BASE_URL}/transport/trips?${params}`, { cache: 'no-store' }),
      fetch(`${API_BASE_URL}/transport/locations`, { cache: 'no-store' }),
    ]);
    if (!trips.ok || !points.ok) throw new Error('Seferler yüklenemedi.');
    results = await trips.json();
    locations = await points.json();
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
    day.setDate(day.getDate() + index - 1);
    const value = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(
      day.getDate(),
    ).padStart(2, '0')}`;
    return { value, date: day, disabled: value < isoDate(0) };
  });

  return (
    <div className="page shell">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3">
        <Link href="/" aria-label="Ana sayfaya dön" className="icon-btn icon-btn-light">
          <ArrowLeft className="h-4 w-4" aria-hidden />
        </Link>
        <nav aria-label="Sıralama" className="segmented">
          {sortOptions.map((option) => {
            const active = (query.sort || 'saat') === option.key;
            return (
              <Link
                key={option.key}
                href={buildHref(baseParams, { sort: option.key })}
                aria-current={active ? 'true' : undefined}
                className={`segmented-item ${active ? 'segmented-item-active' : ''}`}
              >
                {option.label}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Route card */}
      <section className="card map-texture relative mt-4 overflow-hidden p-5 text-ink-900 sm:p-6">
        <div className="relative flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="font-display text-2xl font-extrabold leading-none sm:text-3xl">
              {placeShortName(origin)}
            </p>
            <p className="mt-1.5 truncate text-xs font-semibold text-ink-500">{origin}</p>
          </div>
          <div className="flex min-w-16 flex-1 items-center">
            <span className="h-2 w-2 shrink-0 rounded-full bg-ink-900" />
            <span className="dotted-path" />
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-ink-950 text-white">
              <BusFront className="h-4 w-4" aria-hidden />
            </span>
            <span className="dotted-path" />
            <span className="h-2 w-2 shrink-0 rounded-full bg-brand-600" />
          </div>
          <div className="min-w-0 flex-1 text-right">
            <p className="font-display text-2xl font-extrabold leading-none sm:text-3xl">
              {placeShortName(destination)}
            </p>
            <p className="mt-1.5 truncate text-xs font-semibold text-ink-500">{destination}</p>
          </div>
        </div>

        <div className="relative mt-5 flex flex-wrap items-center gap-2">
          <span className="chip chip-active pointer-events-none">
            {dateFromIso(activeDate).toLocaleDateString('tr-TR', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
            })}
          </span>
          <details className="group">
            <summary className="chip cursor-pointer list-none [&::-webkit-details-marker]:hidden">
              <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden />
              Aramayı değiştir
            </summary>
            <div className="mt-3 w-full rounded-3xl border border-ink-200 bg-ink-50 p-4">
              <SearchPanel
                locations={locations}
                defaultOriginId={query.originId ?? ''}
                defaultDestinationId={query.destinationId ?? ''}
                defaultDate={activeDate}
                compact
              />
            </div>
          </details>
        </div>
      </section>

      {/* Date strip */}
      <nav aria-label="Tarih seçimi" className="mt-4 flex items-center gap-2">
        <Link
          href={buildHref(baseParams, { date: dayStrip[0].value })}
          aria-label="Önceki gün"
          className={`icon-btn icon-btn-light ${
            dayStrip[0].disabled ? 'pointer-events-none opacity-40' : ''
          }`}
        >
          <ChevronLeft className="h-4 w-4" aria-hidden />
        </Link>
        <ul className="hide-scrollbar flex flex-1 justify-between gap-2 overflow-x-auto">
          {dayStrip.map(({ value, date, disabled }) => {
            const active = value === activeDate;
            return (
              <li key={value}>
                <Link
                  href={buildHref(baseParams, { date: value })}
                  aria-current={active ? 'date' : undefined}
                  className={`flex h-16 w-14 flex-col items-center justify-center gap-0.5 rounded-full border transition ${
                    active
                      ? 'border-brand-700 bg-brand-700 text-white shadow-brand'
                      : 'border-ink-200 bg-white text-ink-700 hover:border-ink-400'
                  } ${disabled ? 'pointer-events-none opacity-40' : ''}`}
                >
                  <span className="text-2xs font-bold uppercase">
                    {date.toLocaleDateString('tr-TR', { weekday: 'short' }).slice(0, 3)}
                  </span>
                  <span className="num font-display text-lg font-extrabold leading-none">
                    {date.getDate()}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
        <Link
          href={buildHref(baseParams, { date: dayStrip[dayStrip.length - 1].value })}
          aria-label="Sonraki gün"
          className="icon-btn icon-btn-light"
        >
          <ChevronRight className="h-4 w-4" aria-hidden />
        </Link>
      </nav>

      {/* Result count + time filters */}
      <div className="mt-6 flex items-center justify-between gap-3">
        <h1 className="title-lg">
          {sorted.length} sefer <span className="text-ink-500">bulundu</span>
        </h1>
      </div>
      <div className="hide-scrollbar -mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
        {timeFilters.map(({ key, label, hint, icon: Icon }) => {
          const active = query.time === key;
          return (
            <Link
              key={key}
              href={buildHref(baseParams, { time: active ? null : key })}
              aria-current={active ? 'true' : undefined}
              className={`chip ${active ? 'chip-active' : ''}`}
            >
              <Icon className="h-3.5 w-3.5" aria-hidden />
              {label}
              <span className={active ? 'text-white/70' : 'text-ink-400'}>{hint}</span>
            </Link>
          );
        })}
      </div>

      {/* Results */}
      <div className="mt-4">
        {error ? (
          <p role="alert" className="alert-error">
            {error} API bağlantısını kontrol edip sayfayı yenileyin.
          </p>
        ) : !sorted.length ? (
          <div className="empty-state">
            <span className="grid h-14 w-14 place-items-center rounded-full bg-ink-100 text-ink-400">
              <BusFront className="h-7 w-7" aria-hidden />
            </span>
            <h2 className="title-md mt-4">Bu seçimde sefer bulunamadı</h2>
            <p className="subtle mt-2 max-w-sm">
              {activeTimeFilter
                ? 'Saat filtresini kaldırarak ya da tarihi değiştirerek tekrar deneyin.'
                : 'Tarihi veya terminal seçimini değiştirerek tekrar deneyin.'}
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              {activeTimeFilter ? (
                <Link href={buildHref(baseParams, { time: null })} className="btn btn-secondary">
                  Saat filtresini kaldır
                </Link>
              ) : null}
              <Link href="/#sefer-ara" className="btn btn-primary">
                Yeni arama
              </Link>
            </div>
          </div>
        ) : (
          <ul className="grid gap-4">
            {sorted.map(({ trip, route, bus }, index) => {
              const duration = minutesBetween(trip.departureTime, trip.arrivalTime);
              const seats = availability[index];
              const originName = names.get(route.originId) || origin;
              const destinationName = names.get(route.destinationId) || destination;
              const isCheapest = sorted.length > 1 && trip.basePrice === cheapest;
              return (
                <li key={trip.id}>
                  <article className="card flex overflow-hidden">
                    {/* Brand rail */}
                    <div className="relative flex w-10 shrink-0 flex-col items-center justify-between bg-brand-700 py-4 text-white sm:w-12">
                      <span className="rail-label">Ekspres</span>
                      <span className="grid h-7 w-7 place-items-center rounded-full bg-ink-950">
                        <BusFront className="h-3.5 w-3.5" aria-hidden />
                      </span>
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="p-4 sm:p-5">
                        {isCheapest || (seats && seats.available <= 5) ? (
                          <div className="mb-3 flex flex-wrap gap-2">
                            {isCheapest ? (
                              <span className="badge badge-warn">En uygun fiyat</span>
                            ) : null}
                            {seats && seats.available > 0 && seats.available <= 5 ? (
                              <span className="badge badge-muted">Son {seats.available} koltuk</span>
                            ) : null}
                          </div>
                        ) : null}

                        <div className="flex items-center gap-3">
                          <div className="min-w-0 flex-1">
                            <p className="font-display text-xl font-extrabold leading-none sm:text-2xl">
                              {placeShortName(originName)}
                            </p>
                            <p className="mt-1 truncate text-2xs font-semibold text-ink-500">
                              {originName}
                            </p>
                          </div>
                          <div className="flex min-w-12 flex-1 items-center">
                            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-ink-900" />
                            <span className="dotted-path" />
                            <BusFront
                              className="mx-1 h-4 w-4 shrink-0 text-brand-600"
                              aria-hidden
                            />
                            <span className="dotted-path" />
                            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-brand-600" />
                          </div>
                          <div className="min-w-0 flex-1 text-right">
                            <p className="font-display text-xl font-extrabold leading-none sm:text-2xl">
                              {placeShortName(destinationName)}
                            </p>
                            <p className="mt-1 truncate text-2xs font-semibold text-ink-500">
                              {destinationName}
                            </p>
                          </div>
                        </div>

                        <div className="mt-4 flex items-end justify-between gap-3">
                          <div>
                            <p className="num font-display text-2xl font-extrabold leading-none">
                              {formatTime(trip.departureTime)}
                            </p>
                            <p className="mt-1 text-2xs font-semibold text-ink-500">Kalkış</p>
                          </div>
                          <span className="duration-pill mb-1">
                            <Clock3 className="h-3 w-3" aria-hidden />
                            {formatDuration(duration)}
                          </span>
                          <div className="text-right">
                            <p className="num font-display text-2xl font-extrabold leading-none">
                              {formatTime(trip.arrivalTime)}
                            </p>
                            <p className="mt-1 text-2xs font-semibold text-ink-500">Varış</p>
                          </div>
                        </div>
                      </div>

                      {/* Facts strip */}
                      <dl className="grid grid-cols-3 divide-x divide-ink-200/70 border-t border-ink-200/70 bg-ink-50">
                        <Fact label="Araç" value={bus.plateNumber} />
                        <Fact label="Düzen" value={`${bus.seatLayout?.layout || '2+1'}`} />
                        <Fact
                          label="Boş koltuk"
                          value={seats ? `${seats.available}` : '—'}
                          tone={seats && seats.available === 0 ? 'brand' : 'default'}
                        />
                      </dl>

                      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-ink-200/70 p-4">
                        <div>
                          <p className="text-2xs font-bold uppercase tracking-wide text-ink-500">
                            Yolcu başına
                          </p>
                          <p className="num font-display text-2xl font-extrabold text-ink-900">
                            {formatPrice(trip.basePrice)}
                          </p>
                        </div>
                        <Link
                          href={`/trips/${trip.id}`}
                          className="btn btn-primary max-sm:w-full sm:px-7"
                        >
                          Seferi seç
                          <ArrowRight className="h-4 w-4" aria-hidden />
                        </Link>
                      </div>
                    </div>
                  </article>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

function Fact({
  label,
  value,
  tone = 'default',
}: {
  label: string;
  value: string;
  tone?: 'default' | 'brand';
}) {
  return (
    <div className="min-w-0 px-3 py-2.5 text-center">
      <dt className="text-2xs font-bold uppercase tracking-wide text-ink-500">{label}</dt>
      <dd
        className={`num mt-0.5 truncate text-sm font-bold ${
          tone === 'brand' ? 'text-brand-700' : 'text-ink-900'
        }`}
      >
        {value}
      </dd>
    </div>
  );
}
