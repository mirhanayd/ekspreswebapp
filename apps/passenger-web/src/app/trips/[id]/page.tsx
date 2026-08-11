import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  ArrowLeft,
  Armchair,
  BusFront,
  ChevronRight,
  Clock3,
  CupSoda,
  Luggage,
  MapPin,
  Route as RouteIcon,
  ShieldCheck,
  Snowflake,
  Sofa,
  Usb,
  Wifi,
} from 'lucide-react';
import { API_BASE_URL } from '@/lib/server-api';
import { toLngLat } from '@/lib/geo';
import {
  formatDuration,
  formatLongDate,
  formatPrice,
  formatTime,
  minutesBetween,
  placeShortName,
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
    model?: string;
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
  { icon: Sofa, label: '2+1 geniş koltuk' },
  { icon: Wifi, label: 'Seyahat Wi-Fi' },
  { icon: Usb, label: 'USB şarj' },
  { icon: Snowflake, label: 'Klima' },
  { icon: CupSoda, label: 'İkram servisi' },
  { icon: Luggage, label: 'Bagaj hakkı' },
];

async function loadAvailability(tripId: string) {
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

export default async function TripDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let trip: TripDetail;
  try {
    const response = await fetch(`${API_BASE_URL}/transport/trips/${id}`, { cache: 'no-store' });
    if (response.status === 404) notFound();
    if (!response.ok) throw new Error();
    trip = await response.json();
  } catch {
    return (
      <div className="page shell grid place-items-center">
        <div className="card max-w-md p-8 text-center">
          <h1 className="title-md">Sefer bilgileri yüklenemedi</h1>
          <p className="subtle mt-2">API bağlantısını kontrol edip tekrar deneyin.</p>
          <Link href="/" className="btn btn-primary mt-6">
            Ana sayfaya dön
          </Link>
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
    <div className="page shell-wide pb-24 lg:pb-10">
      <div className="flex items-center gap-3">
        <Link href="/#sefer-ara" aria-label="Aramaya dön" className="icon-btn icon-btn-light">
          <ArrowLeft className="h-4 w-4" aria-hidden />
        </Link>
        <nav
          aria-label="Sayfa yolu"
          className="flex min-w-0 items-center gap-1 text-sm text-ink-500"
        >
          <Link href="/" className="link-quiet">
            Ana sayfa
          </Link>
          <ChevronRight className="h-3.5 w-3.5 shrink-0" aria-hidden />
          <span className="truncate font-semibold text-ink-800">Sefer detayı</span>
        </nav>
      </div>

      {/* Trip summary */}
      <section className="card map-texture relative mt-4 overflow-hidden p-5 sm:p-7">
        <div className="relative grid gap-6 lg:grid-cols-[minmax(0,1fr)_16rem] lg:items-center">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="chip chip-active pointer-events-none">
                {formatLongDate(departure)}
              </span>
              <span className="badge badge-brand">
                {tripStatusLabel[trip.status] ?? trip.status}
              </span>
            </div>

            <div className="mt-5 flex items-center gap-3">
              <div className="min-w-0 flex-1">
                <p className="font-display text-2xl font-extrabold leading-none sm:text-4xl">
                  {placeShortName(originName)}
                </p>
                <p className="mt-1.5 truncate text-xs font-semibold text-ink-500">{originName}</p>
              </div>
              <div className="flex min-w-16 flex-1 items-center">
                <span className="h-2 w-2 shrink-0 rounded-full bg-ink-900" />
                <span className="dotted-path" />
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-ink-950 text-white">
                  <BusFront className="h-4 w-4" aria-hidden />
                </span>
                <span className="dotted-path" />
                <span className="h-2 w-2 shrink-0 rounded-full bg-brand-600" />
              </div>
              <div className="min-w-0 flex-1 text-right">
                <p className="font-display text-2xl font-extrabold leading-none sm:text-4xl">
                  {placeShortName(destinationName)}
                </p>
                <p className="mt-1.5 truncate text-xs font-semibold text-ink-500">
                  {destinationName}
                </p>
              </div>
            </div>

            <h1 className="sr-only">
              {originName} – {destinationName} seferi
            </h1>

            <div className="mt-5 flex flex-wrap items-end justify-between gap-3">
              <TimeBlock label="Kalkış" value={formatTime(trip.departureTime)} />
              <div className="flex flex-col items-center gap-1.5">
                <span className="duration-pill">
                  <Clock3 className="h-3 w-3" aria-hidden />
                  {formatDuration(duration)}
                </span>
                <span className="text-2xs font-semibold text-ink-500">
                  {stops.length ? `${stops.length} durak` : 'Direkt sefer'}
                </span>
              </div>
              <TimeBlock label="Varış" value={formatTime(trip.arrivalTime)} align="right" />
            </div>
          </div>

          <div className="rounded-3xl bg-ink-950 p-5 text-white lg:min-w-56">
            <p className="text-xs font-semibold text-ink-300">Yolcu başına</p>
            <p className="num mt-1 font-display text-4xl font-extrabold">
              {formatPrice(trip.basePrice)}
            </p>
            <p className="mt-2 flex items-center gap-1.5 text-2xs text-ink-300">
              <ShieldCheck className="h-3.5 w-3.5 text-brand-300" aria-hidden />
              Vergiler dahil, gizli ücret yok
            </p>
          </div>
        </div>
      </section>

      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
        <div className="grid gap-4">
          {/* Route timeline */}
          <section className="card p-5 sm:p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="eyebrow">Yolculuk planı</p>
                <h2 className="title-md mt-1">Güzergâh ve duraklar</h2>
              </div>
              <span className="badge badge-muted shrink-0">{trip.route.name}</span>
            </div>

            {stops.length ? (
              <ol className="mt-6">
                {stops.map((stop, index) => {
                  const stopTime = new Date(
                    departure.getTime() + stop.estimatedMinutesFromStart * 60_000,
                  );
                  const isFirst = index === 0;
                  const isLast = index === stops.length - 1;
                  return (
                    <li key={stop.id} className="grid grid-cols-[3.5rem_1.25rem_1fr] gap-3 pb-6 last:pb-0">
                      <span className="num pt-px text-sm font-bold text-ink-900">
                        {formatTime(stopTime)}
                      </span>
                      <span className="relative flex justify-center">
                        <span
                          className={`z-10 mt-1 h-3.5 w-3.5 rounded-full border-[3px] bg-white ${
                            isFirst
                              ? 'border-brand-600'
                              : isLast
                                ? 'border-ink-900'
                                : 'border-ink-300'
                          }`}
                        />
                        {!isLast ? (
                          <span className="absolute bottom-0 top-4 w-0.5 rounded bg-ink-200" />
                        ) : null}
                      </span>
                      <div className="min-w-0">
                        <p className="font-display font-bold text-ink-900">{stop.location?.name}</p>
                        <p className="mt-0.5 text-xs font-medium text-ink-500">
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
              <p className="alert-info mt-5">
                Bu sefer için ara durak tanımlanmamış; yolculuk kalkış ve varış noktaları arasında
                direkt yapılır.
              </p>
            )}
          </section>

          {/* Map */}
          <section className="card overflow-hidden">
            <div className="flex items-center justify-between gap-3 p-5 sm:px-6">
              <div>
                <p className="eyebrow">Rota görünümü</p>
                <h2 className="title-md mt-1">Harita üzerinde güzergâh</h2>
              </div>
              <RouteIcon className="h-5 w-5 shrink-0 text-brand-700" aria-hidden />
            </div>
            <div className="h-72 border-t border-ink-200 bg-ink-100 sm:h-80">
              {mapPoints.length ? (
                <MapView points={mapPoints} />
              ) : (
                <div className="grid h-full place-items-center px-6 text-center">
                  <p className="subtle">
                    Harita verisi şu anda kullanılamıyor. Durak sırası yukarıdaki yolculuk planında
                    listelenmiştir.
                  </p>
                </div>
              )}
            </div>
            {mapPoints.length ? (
              <ul className="flex flex-wrap gap-x-4 gap-y-2 border-t border-ink-100 p-4 text-xs font-medium text-ink-600">
                {mapPoints.map((point, index) => (
                  <li key={point.id} className="flex items-center gap-1.5">
                    <span className="grid h-4 w-4 place-items-center rounded-full bg-ink-800 text-[0.5625rem] font-bold text-white">
                      {index + 1}
                    </span>
                    {point.name}
                  </li>
                ))}
              </ul>
            ) : null}
          </section>

          {/* Fleet standard */}
          <section className="card p-5 sm:p-6">
            <p className="eyebrow">Servis olanakları</p>
            <h2 className="title-md mt-1">Filo standardı</h2>
            <p className="subtle mt-1.5">
              Siirt Kurtalan Ekspres filosundaki araçlarda sunulan standart yolculuk olanakları.
            </p>
            <ul className="mt-5 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
              {fleetStandard.map(({ icon: Icon, label }) => (
                <li
                  key={label}
                  className="flex items-center gap-2.5 rounded-2xl bg-ink-50 px-3 py-2.5 text-sm font-semibold text-ink-800 ring-1 ring-inset ring-ink-100"
                >
                  <Icon className="h-4 w-4 shrink-0 text-brand-700" aria-hidden />
                  <span className="min-w-0 truncate">{label}</span>
                </li>
              ))}
            </ul>
          </section>
        </div>

        {/* Booking aside */}
        <aside className="lg:sticky lg:top-[calc(var(--app-header-h)+1rem)]">
          <div className="card p-5">
            <p className="eyebrow">Araç bilgisi</p>
            <h2 className="title-md mt-1">{trip.bus.model || 'Konfor sınıfı otobüs'}</h2>
            <p className="mt-1 text-sm font-semibold text-ink-500">{trip.bus.plateNumber}</p>

            <dl className="mt-4 grid grid-cols-2 gap-2.5">
              <InfoTile
                icon={<Armchair aria-hidden />}
                label="Düzen"
                value={trip.bus.seatLayout?.layout || '2+1'}
              />
              <InfoTile
                icon={<BusFront aria-hidden />}
                label="Kapasite"
                value={`${trip.bus.totalSeats} koltuk`}
              />
              <InfoTile
                icon={<Clock3 aria-hidden />}
                label="Süre"
                value={formatDuration(duration)}
              />
              <InfoTile
                icon={<MapPin aria-hidden />}
                label="Durak"
                value={stops.length ? `${stops.length} nokta` : 'Direkt'}
              />
            </dl>

            {availability ? (
              <div className="mt-5 rounded-2xl bg-ink-50 p-3.5 ring-1 ring-inset ring-ink-100">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="text-sm font-bold text-ink-900">
                    {availability.available} koltuk boş
                  </p>
                  <p className="text-2xs font-semibold text-ink-500">%{occupancy} dolu</p>
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
              <p className="mt-3 text-center text-2xs leading-5 text-ink-500">
                Koltuklar anlık envanterden gösterilir. Seçtiğiniz koltuk ödeme tamamlanana kadar
                size ayrılır.
              </p>
            </div>
          </div>
        </aside>
      </div>

      {/* Mobile booking bar */}
      <div className="action-bar flex items-center gap-3 lg:hidden">
        <div className="min-w-0">
          <p className="text-2xs font-bold uppercase tracking-wide text-ink-500">Yolcu başına</p>
          <p className="num font-display text-xl font-extrabold leading-tight">
            {formatPrice(trip.basePrice)}
          </p>
        </div>
        <Link href={`/trips/${id}/seats`} className="btn btn-primary ml-auto flex-1">
          <Armchair className="h-4 w-4" aria-hidden />
          Koltuk seç
        </Link>
      </div>
    </div>
  );
}

function TimeBlock({
  label,
  value,
  align = 'left',
}: {
  label: string;
  value: string;
  align?: 'left' | 'right';
}) {
  return (
    <div className={align === 'right' ? 'text-right' : ''}>
      <p className="text-2xs font-bold uppercase tracking-wide text-ink-400">{label}</p>
      <p className="num font-display text-3xl font-extrabold leading-none">{value}</p>
    </div>
  );
}

function InfoTile({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="data-tile">
      <span className="text-brand-700 [&>svg]:h-4 [&>svg]:w-4">{icon}</span>
      <dt className="data-label mt-1.5">{label}</dt>
      <dd className="data-value">{value}</dd>
    </div>
  );
}
