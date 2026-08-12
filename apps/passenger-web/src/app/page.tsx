import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, BusFront, Clock3, MapPin, Search, Ticket, Wallet } from 'lucide-react';
import { API_BASE_URL, authenticatedApiFetch } from '@/lib/server-api';
import type { SearchLocation } from '@/components/SearchPanel';
import {
  formatDayMonth,
  formatDuration,
  formatPrice,
  formatTime,
  isoDate,
  minutesBetween,
  placeShortName,
} from '@/lib/format';

type Location = SearchLocation & { type: string };
type Route = { id: string; name: string; originId: string; destinationId: string };
type TripResult = {
  trip: { id: string; departureTime: string; arrivalTime: string; basePrice: number };
  route: { name: string; originId: string; destinationId: string };
  bus: { model: string; plateNumber: string; seatLayout?: { layout?: string } };
};
type ActiveTicket = {
  id: string;
  ticketNo: string;
  tripSeat: { seatNo: string };
  trip: {
    id: string;
    status: string;
    departureTime: string;
    route: { origin: { name: string }; destination: { name: string } };
  };
};

async function loadJson<T>(path: string, fallback: T): Promise<T> {
  try {
    const response = await fetch(`${API_BASE_URL}${path}`, { cache: 'no-store' });
    if (!response.ok) return fallback;
    return (await response.json()) as T;
  } catch {
    // The screen keeps its shell and shows an actionable notice instead.
    return fallback;
  }
}

async function loadActiveTicket(): Promise<ActiveTicket | null> {
  try {
    const response = await authenticatedApiFetch('/tickets');
    if (!response?.ok) return null;
    const data = await response.json();
    return (data.active as ActiveTicket[])?.[0] ?? null;
  } catch {
    return null;
  }
}

/**
 * Home — `ui/mobile-home-reference.png`.
 *
 * Greeting row with a circular status widget, a small tracked eyebrow, an
 * oversized two-line display heading paired with a tall search capsule, a
 * horizontally scrolling chip rail with the first chip filled near-black, and a
 * large rounded hero image card whose scrim carries the title, a short
 * description, three icon stats and a white outline pill.
 */
export default async function Home() {
  const [locations, routes, trips, activeTicket] = await Promise.all([
    loadJson<Location[]>('/transport/locations', []),
    loadJson<Route[]>('/transport/routes', []),
    loadJson<TripResult[]>('/transport/trips', []),
    loadActiveTicket(),
  ]);

  const names = new Map(locations.map((location) => [location.id, location.name]));
  const popular = routes
    .filter((route) => names.has(route.originId) && names.has(route.destinationId))
    .slice(0, 6);
  const tomorrow = isoDate(1);

  const featured = trips
    .filter((item) => new Date(item.trip.departureTime).getTime() > Date.now())
    .sort(
      (a, b) => new Date(a.trip.departureTime).getTime() - new Date(b.trip.departureTime).getTime(),
    )[0];

  const featuredOrigin = featured ? (names.get(featured.route.originId) ?? '') : '';
  const featuredDestination = featured ? (names.get(featured.route.destinationId) ?? '') : '';

  return (
    <div className="canvas-sage min-h-[100dvh]">
      <div className="screen screen-pad">
        {/* Greeting + status widget ------------------------------------- */}
        <div className="top-row">
          <p className="font-display text-[1.375rem] font-bold leading-tight text-ink-900">
            Merhaba{' '}
            <span aria-hidden className="inline-block">
              👋
            </span>
          </p>

          <div className="flex items-center gap-2.5">
            <span className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-white text-ink-900 shadow-card">
              <BusFront className="h-6 w-6" aria-hidden />
            </span>
            <p className="leading-tight">
              <span className="block text-[0.8125rem] font-semibold text-ink-500">Bugün</span>
              <span className="block font-display text-[0.9375rem] font-bold text-ink-900">
                {formatDayMonth(new Date())}
              </span>
            </p>
          </div>
        </div>

        {/* Eyebrow + display heading + search capsule ------------------- */}
        <p className="eyebrow mt-9">
          <MapPin className="h-3.5 w-3.5" aria-hidden />
          Siirt · Kurtalan
        </p>

        <div className="mt-2 flex items-start justify-between gap-4">
          <h1 className="display-1 min-w-0">
            Yolun
            <br />
            Hazır
          </h1>
          <Link
            href="/search"
            aria-label="Sefer arama ekranı"
            className="search-capsule mt-1 lg:h-14 lg:w-14"
          >
            <Search className="h-[1.375rem] w-[1.375rem]" aria-hidden />
          </Link>
        </div>

        {/* Popular route chips ----------------------------------------- */}
        {popular.length ? (
          <nav aria-label="Popüler hatlar" className="rail-scroll mt-6">
            {popular.map((route, index) => (
              <Link
                key={route.id}
                href={`/search?originId=${route.originId}&destinationId=${route.destinationId}&date=${tomorrow}`}
                className={`chip ${index === 0 ? 'chip-active' : ''}`}
              >
                <BusFront className="h-4 w-4 shrink-0" aria-hidden />
                {placeShortName(names.get(route.originId) ?? '')} –{' '}
                {placeShortName(names.get(route.destinationId) ?? '')}
              </Link>
            ))}
          </nav>
        ) : (
          <p role="alert" className="alert-error mt-6">
            Hat bilgileri şu anda yüklenemedi. Lütfen bir süre sonra tekrar deneyin.
          </p>
        )}

        {/* Hero service card ------------------------------------------- */}
        <figure className="relative mt-7 overflow-hidden rounded-[2rem] bg-ink-900 shadow-lift">
          <Image
            src="/brand/coach.jpg"
            alt="Siirt Kurtalan Ekspres filosuna ait şehirlerarası otobüs"
            fill
            sizes="(max-width: 1024px) 100vw, 640px"
            priority
            className="object-cover object-center"
          />
          <div className="absolute inset-0 bg-hero-scrim" aria-hidden />

          <figcaption className="relative flex min-h-[19.5rem] flex-col items-center justify-end px-6 pb-6 pt-24 text-center text-white sm:min-h-[22rem]">
            {featured ? (
              <>
                <p className="font-display text-[1.5rem] font-bold leading-tight">
                  {placeShortName(featuredOrigin)} – {placeShortName(featuredDestination)}
                </p>
                <p className="mt-2 max-w-[17rem] text-[0.8125rem] leading-5 text-white/75">
                  2+1 geniş koltuk düzeni, gerçek koltuk seçimi ve yolculuk boyunca canlı sefer
                  takibi.
                </p>

                <ul className="mt-4 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[0.8125rem] font-semibold">
                  <li className="flex items-center gap-1.5">
                    <Clock3 className="h-4 w-4 text-white/60" aria-hidden />
                    {formatTime(featured.trip.departureTime)}
                  </li>
                  <li className="flex items-center gap-1.5">
                    <MapPin className="h-4 w-4 text-white/60" aria-hidden />
                    {formatDuration(
                      minutesBetween(featured.trip.departureTime, featured.trip.arrivalTime),
                    )}
                  </li>
                  <li className="flex items-center gap-1.5">
                    <Wallet className="h-4 w-4 text-white/60" aria-hidden />
                    {formatPrice(featured.trip.basePrice)}
                  </li>
                </ul>

                <Link
                  href={`/trips/${featured.trip.id}`}
                  className="btn btn-outline-invert mt-6 px-9"
                >
                  Seferi incele
                </Link>
              </>
            ) : (
              <>
                <p className="font-display text-[1.5rem] font-bold leading-tight">
                  Bölgenin ekspres hattı
                </p>
                <p className="mt-2 max-w-[17rem] text-[0.8125rem] leading-5 text-white/75">
                  Modern filo, 2+1 konforlu koltuk düzeni ve canlı sefer takibi.
                </p>
                <Link href="/search" className="btn btn-outline-invert mt-6 px-9">
                  Sefer ara
                </Link>
              </>
            )}
          </figcaption>
        </figure>

        {/* Active ticket shortcut -------------------------------------- */}
        {activeTicket ? (
          <Link
            href={`/tickets/${activeTicket.id}`}
            className="mt-4 flex items-center gap-3 rounded-card bg-white p-4 shadow-card transition hover:bg-cream-50"
          >
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-[1.125rem] bg-lime-400 text-ink-900">
              <Ticket className="h-5 w-5" aria-hidden />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[0.6875rem] font-semibold uppercase tracking-[0.14em] text-ink-500">
                Yaklaşan yolculuğun
              </span>
              <span className="mt-0.5 block truncate font-display text-[0.9375rem] font-bold text-ink-900">
                {placeShortName(activeTicket.trip.route.origin.name)} –{' '}
                {placeShortName(activeTicket.trip.route.destination.name)} ·{' '}
                {formatTime(activeTicket.trip.departureTime)}
              </span>
            </span>
            <ArrowRight className="h-5 w-5 shrink-0 text-ink-400" aria-hidden />
          </Link>
        ) : null}
      </div>
    </div>
  );
}
