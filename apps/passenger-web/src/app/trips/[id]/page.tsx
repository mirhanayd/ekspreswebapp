import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ServerError } from '@ekspres/database';
import {
  Armchair,
  BusFront,
  Clock3,
  CupSoda,
  Luggage,
  Snowflake,
  Sofa,
  Usb,
  Wifi,
} from 'lucide-react';
import { getSeatMap } from '@/lib/server-seats';
import { getTripDetails } from '@/lib/server-transport';
import { toLngLat } from '@/lib/geo';
import { ScreenHeader } from '@/components/ScreenHeader';
import { RoutePanel } from '@/components/RoutePanel';
import {
  formatDuration,
  formatLongDate,
  formatPrice,
  formatTime,
  minutesBetween,
  tripStatusLabel,
} from '@/lib/format';
import MapView, { type RouteStopPoint } from './MapView';

type Stop = {
  id: string;
  estimatedMinutesFromStart: number;
  location?: { name: string; type: string; coordinates?: unknown };
};

type TripDetail = {
  id: string;
  departureTime: string;
  arrivalTime: string;
  status: string;
  basePrice: number;
  bus: {
    plateNumber: string;
    model?: string | null;
    totalSeats: number;
    seatLayout?: { layout?: string };
  };
  route: {
    name: string;
    origin?: { name: string };
    destination?: { name: string };
    stops?: Stop[];
  };
};

const fleetStandard = [
  { icon: Sofa, label: '2+1 koltuk' },
  { icon: Wifi, label: 'Seyahat Wi-Fi' },
  { icon: Usb, label: 'USB şarj' },
  { icon: Snowflake, label: 'Klima' },
  { icon: CupSoda, label: 'İkram servisi' },
  { icon: Luggage, label: 'Bagaj hakkı' },
];

async function loadAvailability(tripId: string) {
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
 * Trip detail. No direct reference screen, so it is composed strictly from the
 * booking language of `ui/trip-search-reference.png`: cream canvas, circular
 * back control, the tinted route panel, a #FFFA93 facts strip, white cards with
 * the same radii, and a near-black sticky action bar.
 */
export default async function TripDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let trip: TripDetail;
  try {
    trip = await getTripDetails(id);
  } catch (error) {
    if (error instanceof ServerError && error.status === 404) notFound();
    return (
      <div className="canvas-cream min-h-[100dvh]">
        <div className="screen screen-pad">
          <ScreenHeader backHref="/search" backLabel="Aramaya dön" />
          <div className="empty-state mt-6">
            <h1 className="title-md">Sefer bilgileri yüklenemedi</h1>
            <p className="subtle mt-2 max-w-xs">API bağlantısını kontrol edip tekrar deneyin.</p>
            <Link href="/search" className="btn btn-primary mt-6">
              Aramaya dön
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const availability = await loadAvailability(id);
  const stops = trip.route.stops ?? [];
  const duration = minutesBetween(trip.departureTime, trip.arrivalTime);
  const departure = new Date(trip.departureTime);
  const originName = trip.route.origin?.name ?? 'Kalkış';
  const destinationName = trip.route.destination?.name ?? 'Varış';

  const mapPoints: RouteStopPoint[] = stops.flatMap((stop) => {
    const point = toLngLat(stop.location?.coordinates);
    return point ? [{ id: stop.id, name: stop.location?.name ?? '', ...point }] : [];
  });

  const occupancy = availability
    ? Math.round(((availability.total - availability.available) / availability.total) * 100)
    : null;

  return (
    <div className="canvas-cream min-h-[100dvh]">
      <div className="screen-wide screen-pad pb-40 lg:pb-14">
        <ScreenHeader backHref="/search" backLabel="Aramaya dön" title="Sefer detayı" />

        <h1 className="sr-only">
          {originName} – {destinationName} seferi
        </h1>

        <div className="mt-6 lg:grid lg:grid-cols-[minmax(0,1fr)_21rem] lg:items-start lg:gap-6">
          <div className="min-w-0">
            {/* Route + times ------------------------------------------- */}
            <RoutePanel originName={originName} destinationName={destinationName}>
              <div className="flex items-end justify-between gap-3">
                <div>
                  <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.14em] text-ink-500">
                    Kalkış
                  </p>
                  <p className="num font-display text-[1.75rem] font-bold leading-none text-ink-900">
                    {formatTime(trip.departureTime)}
                  </p>
                </div>
                <span className="duration-pill mb-1">
                  <Clock3 className="h-4 w-4" aria-hidden />
                  {formatDuration(duration)}
                </span>
                <div className="text-right">
                  <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.14em] text-ink-500">
                    Varış
                  </p>
                  <p className="num font-display text-[1.75rem] font-bold leading-none text-ink-900">
                    {formatTime(trip.arrivalTime)}
                  </p>
                </div>
              </div>
            </RoutePanel>

            <div className="rail-scroll mt-4">
              <span className="chip chip-flat pointer-events-none">
                {formatLongDate(departure)}
              </span>
              <span className="chip chip-flat pointer-events-none">
                {tripStatusLabel[trip.status] ?? trip.status}
              </span>
              <span className="chip chip-flat pointer-events-none">{trip.route.name}</span>
            </div>

            {/* Facts strip --------------------------------------------- */}
            <dl className="facts-strip mt-4 overflow-hidden rounded-[1.25rem]">
              <div className="fact">
                <dt className="fact-label">Araç</dt>
                <dd className="fact-value">{trip.bus.plateNumber}</dd>
              </div>
              <div className="fact">
                <dt className="fact-label">Düzen</dt>
                <dd className="fact-value">{trip.bus.seatLayout?.layout || '2+1'}</dd>
              </div>
              <div className="fact">
                <dt className="fact-label">Boş koltuk</dt>
                <dd className="fact-value">{availability ? `${availability.available}` : '—'}</dd>
              </div>
            </dl>

            {/* Route timeline ------------------------------------------- */}
            <section className="card card-pad mt-4">
              <h2 className="title-md">Güzergâh ve duraklar</h2>

              {stops.length ? (
                <ol className="mt-5">
                  {stops.map((stop, index) => {
                    const stopTime = new Date(
                      departure.getTime() + stop.estimatedMinutesFromStart * 60_000,
                    );
                    const isFirst = index === 0;
                    const isLast = index === stops.length - 1;
                    return (
                      <li
                        key={stop.id}
                        className="grid grid-cols-[3.25rem_1.25rem_1fr] gap-3 pb-6 last:pb-0"
                      >
                        <span className="num pt-px text-sm font-bold text-ink-900">
                          {formatTime(stopTime)}
                        </span>
                        <span className="relative flex justify-center">
                          <span
                            className={`z-10 mt-1 h-3.5 w-3.5 rounded-full border-[3px] bg-white ${
                              isFirst
                                ? 'border-ink-900'
                                : isLast
                                  ? 'border-lime-500'
                                  : 'border-ink-300'
                            }`}
                          />
                          {!isLast ? (
                            <span className="absolute bottom-0 top-4 w-0.5 rounded bg-ink-900/10" />
                          ) : null}
                        </span>
                        <div className="min-w-0">
                          <p className="font-display text-[0.9375rem] font-bold text-ink-900">
                            {stop.location?.name}
                          </p>
                          <p className="caption mt-0.5">
                            {stop.location?.type === 'terminal' ? 'Otogar' : 'Yolcu durağı'}
                            {stop.estimatedMinutesFromStart > 0
                              ? ` · kalkıştan ${formatDuration(stop.estimatedMinutesFromStart)} sonra`
                              : ' · hareket noktası'}
                          </p>
                        </div>
                      </li>
                    );
                  })}
                </ol>
              ) : (
                <p className="alert-info mt-4">
                  Bu sefer için ara durak tanımlanmamış; yolculuk kalkış ve varış noktaları arasında
                  direkt yapılır.
                </p>
              )}
            </section>

            {/* Map ------------------------------------------------------ */}
            <section className="card mt-4 overflow-hidden">
              <h2 className="title-md px-5 pb-4 pt-5">Harita üzerinde güzergâh</h2>
              <div className="h-72 bg-cream-300">
                {mapPoints.length ? (
                  <MapView points={mapPoints} />
                ) : (
                  <div className="grid h-full place-items-center px-6 text-center">
                    <p className="subtle">
                      Harita verisi şu anda kullanılamıyor. Durak sırası yukarıdaki planda
                      listelenmiştir.
                    </p>
                  </div>
                )}
              </div>
            </section>

            {/* Fleet standard ------------------------------------------- */}
            <section className="card card-pad mt-4">
              <h2 className="title-md">Filo standardı</h2>
              <ul className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                {fleetStandard.map(({ icon: Icon, label }) => (
                  <li
                    key={label}
                    className="flex items-center gap-2.5 rounded-[1.125rem] bg-cream-200 px-3 py-2.5 text-[0.8125rem] font-semibold text-ink-800"
                  >
                    <Icon className="h-4 w-4 shrink-0 text-ink-500" aria-hidden />
                    <span className="min-w-0 truncate">{label}</span>
                  </li>
                ))}
              </ul>
            </section>
          </div>

          {/* Booking aside -------------------------------------------- */}
          <aside className="mt-4 lg:sticky lg:top-[calc(var(--app-header-h)+1rem)] lg:mt-0">
            <div className="card card-pad">
              <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.14em] text-ink-500">
                Yolcu başına
              </p>
              <p className="num mt-1 font-display text-[2.25rem] font-bold leading-none text-ink-900">
                {formatPrice(trip.basePrice)}
              </p>
              <p className="caption mt-2">Vergiler dahil, gizli ücret yok.</p>

              {availability ? (
                <div className="mt-5">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="text-sm font-semibold text-ink-900">
                      {availability.available} koltuk boş
                    </p>
                    <p className="caption">%{occupancy} dolu</p>
                  </div>
                  <span className="meter mt-2">
                    <span className="meter-fill" style={{ width: `${occupancy}%` }} />
                  </span>
                </div>
              ) : null}

              <div className="mt-5 hidden lg:block">
                <Link href={`/trips/${id}/seats`} className="btn btn-primary w-full">
                  <Armchair className="h-4 w-4" aria-hidden />
                  Koltuk seç
                </Link>
                <p className="caption mt-3 text-center leading-5">
                  Seçtiğiniz koltuk ödeme tamamlanana kadar size ayrılır.
                </p>
              </div>
            </div>

            <div className="card card-pad mt-4">
              <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.14em] text-ink-500">
                Araç
              </p>
              <p className="mt-1 font-display text-[0.9375rem] font-bold text-ink-900">
                {trip.bus.model || 'Konfor sınıfı otobüs'}
              </p>
              <p className="caption mt-0.5">
                {trip.bus.plateNumber} · {trip.bus.totalSeats} koltuk ·{' '}
                <BusFront className="inline h-3.5 w-3.5 align-text-bottom" aria-hidden />{' '}
                {trip.bus.seatLayout?.layout || '2+1'}
              </p>
            </div>
          </aside>
        </div>
      </div>

      {/* Mobile booking bar ------------------------------------------- */}
      <div className="action-bar flex items-center gap-3 lg:hidden">
        <p className="min-w-0 pl-2">
          <span className="block text-[0.6875rem] font-semibold text-ink-500">Yolcu başına</span>
          <span className="num block font-display text-xl font-bold leading-tight text-ink-900">
            {formatPrice(trip.basePrice)}
          </span>
        </p>
        <Link href={`/trips/${id}/seats`} className="btn btn-primary ml-auto flex-1">
          <Armchair className="h-4 w-4" aria-hidden />
          Koltuk seç
        </Link>
      </div>
    </div>
  );
}
