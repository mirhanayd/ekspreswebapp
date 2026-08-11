import { ArrowRight, BusFront, CalendarDays, Clock3, Route, UsersRound } from 'lucide-react';
import Link from 'next/link';
import { API_BASE_URL } from '@/lib/server-api';

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

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ originId?: string; destinationId?: string; date?: string }>;
}) {
  const query = await searchParams;
  const params = new URLSearchParams();
  if (query.originId) params.set('originId', query.originId);
  if (query.destinationId) params.set('destinationId', query.destinationId);
  if (query.date) params.set('date', query.date);
  let results: SearchResult[] = [];
  let locations: Array<{ id: string; name: string }> = [];
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
  const origin = names.get(query.originId || '') || 'Kalkış';
  const destination = names.get(query.destinationId || '') || 'Varış';
  return (
    <div className="page-shell">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="rounded-2xl bg-slate-950 p-5 text-white sm:p-7">
          <Link href="/#sefer-ara" className="text-sm font-bold text-red-400 hover:text-red-300">
            ← Aramayı değiştir
          </Link>
          <div className="mt-5 flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div>
              <p className="eyebrow !text-red-400">Uygun seferler</p>
              <h1 className="mt-2 flex flex-wrap items-center gap-3 text-3xl font-black sm:text-4xl">
                <span>{origin}</span>
                <ArrowRight className="h-6 w-6 text-red-500" />
                <span>{destination}</span>
              </h1>
            </div>
            <div className="flex items-center gap-2 text-sm text-slate-300">
              <CalendarDays className="h-5 w-5 text-red-400" />
              {query.date
                ? new Date(`${query.date}T12:00:00`).toLocaleDateString('tr-TR', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                  })
                : 'Tüm tarihler'}
            </div>
          </div>
        </div>
        {error ? (
          <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-800">
            {error}
          </p>
        ) : !results.length ? (
          <div className="surface-card p-10 text-center">
            <BusFront className="mx-auto h-12 w-12 text-stone-300" />
            <h2 className="mt-4 text-xl font-black">Bu tarihte sefer bulunamadı</h2>
            <p className="mt-2 text-sm text-slate-500">
              Tarihi veya terminal seçimini değiştirerek tekrar deneyin.
            </p>
            <Link href="/#sefer-ara" className="primary-action mt-6">
              Yeni arama
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {results.map(({ trip, bus }) => {
              const departure = new Date(trip.departureTime);
              const arrival = new Date(trip.arrivalTime);
              const minutes = Math.round((arrival.getTime() - departure.getTime()) / 60000);
              return (
                <article
                  key={trip.id}
                  className="surface-card overflow-hidden transition hover:-translate-y-0.5 hover:shadow-lg"
                >
                  <div className="grid gap-5 p-5 sm:p-6 lg:grid-cols-[1fr_auto] lg:items-center">
                    <div>
                      <div className="flex items-center gap-5">
                        <div>
                          <p className="text-2xl font-black tabular-nums">
                            {departure.toLocaleTimeString('tr-TR', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </p>
                          <p className="text-sm font-semibold text-slate-600">{origin}</p>
                        </div>
                        <div className="flex min-w-20 flex-1 items-center">
                          <span className="h-2.5 w-2.5 rounded-full bg-red-700" />
                          <span className="h-px flex-1 bg-stone-300" />
                          <BusFront className="mx-2 h-5 w-5 text-red-700" />
                          <span className="h-px flex-1 bg-stone-300" />
                          <span className="h-2.5 w-2.5 rounded-full border-2 border-slate-400 bg-white" />
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-black tabular-nums">
                            {arrival.toLocaleTimeString('tr-TR', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </p>
                          <p className="text-sm font-semibold text-slate-600">{destination}</p>
                        </div>
                      </div>
                      <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 border-t border-stone-100 pt-4 text-xs font-medium text-slate-500">
                        <span className="flex items-center gap-1.5">
                          <Clock3 className="h-4 w-4" />
                          {Math.floor(minutes / 60)} sa {minutes % 60} dk
                        </span>
                        <span className="flex items-center gap-1.5">
                          <Route className="h-4 w-4" />
                          Direkt sefer
                        </span>
                        <span className="flex items-center gap-1.5">
                          <UsersRound className="h-4 w-4" />
                          {bus.seatLayout?.layout || '2+1'} koltuk
                        </span>
                        <span>
                          {bus.model} • {bus.plateNumber}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between gap-5 border-t border-stone-100 pt-5 lg:block lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0 lg:text-right">
                      <div>
                        <p className="text-xs font-semibold text-slate-500">Kişi başı</p>
                        <p className="text-2xl font-black">
                          {trip.basePrice.toLocaleString('tr-TR')} ₺
                        </p>
                      </div>
                      <Link href={`/trips/${trip.id}`} className="primary-action lg:mt-4">
                        Seferi seç <ArrowRight className="h-4 w-4" />
                      </Link>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
