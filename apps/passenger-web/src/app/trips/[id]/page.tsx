import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  ArrowRight,
  Armchair,
  BusFront,
  CalendarDays,
  Check,
  Clock3,
  MapPinned,
  Route,
} from 'lucide-react';
import { API_BASE_URL } from '@/lib/server-api';
import MapView from './MapView';

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
const time = (value: string) =>
  new Date(value).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });

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
      <div className="page-shell grid place-items-center">
        <div className="surface-card max-w-md p-8 text-center">
          <h1 className="text-xl font-black">Sefer bilgileri yüklenemedi</h1>
          <p className="mt-2 text-sm text-slate-500">
            API bağlantısını kontrol edip tekrar deneyin.
          </p>
          <Link href="/" className="primary-action mt-6">
            Ana sayfa
          </Link>
        </div>
      </div>
    );
  }
  const stops = trip.route.stops || [];
  const departure = new Date(trip.departureTime);
  const arrival = new Date(trip.arrivalTime);
  const duration = Math.max(0, Math.round((arrival.getTime() - departure.getTime()) / 60000));
  return (
    <div className="page-shell">
      <div className="mx-auto max-w-7xl space-y-5">
        <nav className="text-sm font-semibold text-slate-500">
          <Link href="/" className="hover:text-red-700">
            Ana sayfa
          </Link>
          <span className="px-2">/</span>
          <span>Sefer detayı</span>
        </nav>
        <section className="overflow-hidden rounded-3xl bg-slate-950 text-white shadow-xl">
          <div className="grid gap-8 p-6 sm:p-8 lg:grid-cols-[1fr_auto] lg:items-end">
            <div>
              <p className="eyebrow !text-red-400">
                {departure.toLocaleDateString('tr-TR', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                })}
              </p>
              <h1 className="mt-3 flex flex-wrap items-center gap-3 text-3xl font-black tracking-tight sm:text-5xl">
                <span>{trip.route.origin?.name}</span>
                <ArrowRight className="h-7 w-7 text-red-500" />
                <span>{trip.route.destination?.name}</span>
              </h1>
              <div className="mt-6 flex flex-wrap gap-x-6 gap-y-3 text-sm text-slate-300">
                <span className="flex items-center gap-2">
                  <Clock3 className="h-5 w-5 text-red-400" />
                  {time(trip.departureTime)} – {time(trip.arrivalTime)}
                </span>
                <span className="flex items-center gap-2">
                  <Route className="h-5 w-5 text-red-400" />
                  {Math.floor(duration / 60)} sa {duration % 60} dk
                </span>
                <span className="flex items-center gap-2">
                  <BusFront className="h-5 w-5 text-red-400" />
                  {trip.bus.plateNumber}
                </span>
              </div>
            </div>
            <div className="rounded-2xl bg-white/10 p-5 text-left backdrop-blur lg:min-w-56 lg:text-right">
              <p className="text-sm text-slate-300">Kişi başı</p>
              <p className="mt-1 text-4xl font-black">{trip.basePrice.toLocaleString('tr-TR')} ₺</p>
              <p className="mt-2 text-xs text-slate-400">Vergiler dahil demo fiyatı</p>
            </div>
          </div>
        </section>
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_380px]">
          <div className="space-y-5">
            <section className="surface-card p-5 sm:p-7">
              <div className="flex items-center justify-between">
                <div>
                  <p className="eyebrow">Yolculuk planı</p>
                  <h2 className="mt-1 text-2xl font-black">Güzergâh ve duraklar</h2>
                </div>
                <MapPinned className="h-7 w-7 text-red-700" />
              </div>
              <ol className="mt-7 space-y-0">
                {stops.map((stop, index) => (
                  <li
                    key={stop.id}
                    className="relative grid grid-cols-[44px_1fr] gap-3 pb-7 last:pb-0"
                  >
                    <div className="relative flex justify-center">
                      <span
                        className={`z-10 mt-1 h-4 w-4 rounded-full border-4 ${index === 0 ? 'border-red-700 bg-white' : index === stops.length - 1 ? 'border-slate-800 bg-white' : 'border-stone-300 bg-white'}`}
                      />
                      {index < stops.length - 1 && (
                        <span className="absolute bottom-0 top-4 w-px bg-stone-300" />
                      )}
                    </div>
                    <div>
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <p className="font-black">{stop.location?.name}</p>
                        <p className="text-sm font-bold text-red-700">
                          +{stop.estimatedMinutesFromStart} dk
                        </p>
                      </div>
                      <p className="mt-1 text-sm text-slate-500">
                        {stop.location?.type === 'terminal' ? 'Otogar' : 'Yolcu durağı'}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            </section>
            <section className="surface-card overflow-hidden">
              <div className="flex items-center justify-between p-5 sm:px-7">
                <div>
                  <p className="eyebrow">Rota görünümü</p>
                  <h2 className="mt-1 text-xl font-black">Harita</h2>
                </div>
                <Route className="h-6 w-6 text-red-700" />
              </div>
              <div className="h-80 border-t bg-stone-100">
                <MapView stops={stops} />
              </div>
            </section>
          </div>
          <aside className="lg:sticky lg:top-24 lg:self-start">
            <div className="surface-card p-6">
              <p className="eyebrow">Araç bilgisi</p>
              <h2 className="mt-2 text-xl font-black">
                {trip.bus.model || 'Konfor sınıfı otobüs'}
              </h2>
              <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
                <Info
                  icon={<Armchair />}
                  label="Düzen"
                  value={trip.bus.seatLayout?.layout || '2+1'}
                />
                <Info
                  icon={<BusFront />}
                  label="Kapasite"
                  value={`${trip.bus.totalSeats} koltuk`}
                />
                <Info
                  icon={<CalendarDays />}
                  label="Durum"
                  value={
                    trip.status === 'scheduled'
                      ? 'Planlandı'
                      : trip.status === 'boarding'
                        ? 'Biniş'
                        : 'Yolda'
                  }
                />
                <Info icon={<Check />} label="Hizmet" value="Ekspres" />
              </div>
              <Link href={`/trips/${id}/seats`} className="primary-action mt-6 w-full">
                <Armchair className="h-5 w-5" /> Koltuk seç
              </Link>
              <p className="mt-3 text-center text-xs leading-5 text-slate-500">
                Uygun koltuklar anlık envanterden gösterilir ve seçiminiz süreli olarak ayrılır.
              </p>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

function Info({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-xl bg-stone-50 p-3">
      <span className="text-red-700 [&>svg]:h-5 [&>svg]:w-5">{icon}</span>
      <p className="mt-2 text-xs text-slate-500">{label}</p>
      <p className="font-bold">{value}</p>
    </div>
  );
}
