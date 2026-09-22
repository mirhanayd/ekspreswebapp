import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, BusFront, Clock3, MapPin, Ticket, Wallet } from 'lucide-react';
import { authenticatedApiFetch } from '@/lib/server-api';
import { getLocations, getRoutes, getTrips } from '@/lib/server-transport';
import type { SearchLocation } from '@/components/SearchPanel';
import { HomeJourney } from '@/components/HomeJourney';
import { RewardLadder } from '@/components/RewardLadder';
import { tiersReached } from '@/lib/campaigns';
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

/**
 * The passenger's own wallet: the next journey to surface, plus how many
 * journeys they have taken so the reward ladder reflects real history.
 */
async function loadWallet(): Promise<{ active: ActiveTicket | null; tripCount: number }> {
  try {
    const response = await authenticatedApiFetch('/tickets');
    if (!response?.ok) return { active: null, tripCount: 0 };
    const data = await response.json();
    const active = (data.active as ActiveTicket[]) ?? [];
    const past = (data.past as ActiveTicket[]) ?? [];
    return { active: active[0] ?? null, tripCount: past.length };
  } catch {
    return { active: null, tripCount: 0 };
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
  const [locations, routes, trips, wallet] = await Promise.all([
    getLocations().catch(() => [] as Location[]),
    getRoutes().catch(() => [] as Route[]),
    getTrips().catch(() => [] as TripResult[]),
    loadWallet(),
  ]);
  const activeTicket = wallet.active;

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

        {/* Area + display heading + inline journey editor ---------------- */}
        <HomeJourney locations={locations} defaultDate={tomorrow} />

        {/* Popular route chips ----------------------------------------- */}
        {popular.length ? (
          <nav aria-label="Popüler hatlar" className="rail-scroll mt-5">
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
        ) : null}

        {/* Reward ladder ------------------------------------------------ */}
        <div className="mt-6">
          <RewardLadder reached={tiersReached(wallet.tripCount)} tripCount={wallet.tripCount} />
        </div>

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
