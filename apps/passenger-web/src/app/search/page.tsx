import { ArrowRight, Bus, Calendar, Clock } from 'lucide-react';
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
  bus: { model: string; plateNumber: string; seatLayout: { layout?: string } };
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
    const [tripResponse, locationResponse] = await Promise.all([
      fetch(`${API_BASE_URL}/transport/trips?${params}`, { cache: 'no-store' }),
      fetch(`${API_BASE_URL}/transport/locations`, { cache: 'no-store' }),
    ]);
    if (!tripResponse.ok || !locationResponse.ok) throw new Error('Seferler yüklenemedi.');
    results = await tripResponse.json();
    locations = await locationResponse.json();
  } catch (caught) {
    error = caught instanceof Error ? caught.message : 'Seferler yüklenemedi.';
  }
  const locationName = new Map(locations.map((location) => [location.id, location.name]));

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="mx-auto max-w-4xl space-y-6">
        <div>
          <Link href="/" className="text-sm font-semibold text-red-700">
            ← Aramayı değiştir
          </Link>
          <h1 className="mt-3 text-3xl font-bold text-gray-950">Uygun seferler</h1>
          <p className="mt-1 text-gray-500">
            {query.date
              ? new Date(`${query.date}T12:00:00`).toLocaleDateString('tr-TR')
              : 'Tüm tarihler'}
          </p>
        </div>

        {error ? (
          <p className="rounded-xl bg-red-50 p-4 text-red-700">{error}</p>
        ) : results.length === 0 ? (
          <div className="rounded-2xl border bg-white p-8 text-center text-gray-500">
            Bu arama için uygun sefer bulunamadı.
          </div>
        ) : (
          <div className="space-y-4">
            {results.map(({ trip, route, bus }) => (
              <article key={trip.id} className="rounded-2xl border bg-white p-5 shadow-sm">
                <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 text-lg font-semibold text-gray-950">
                      <span>{locationName.get(route.originId) || 'Kalkış'}</span>
                      <ArrowRight className="h-5 w-5 text-red-600" />
                      <span>{locationName.get(route.destinationId) || 'Varış'}</span>
                    </div>
                    <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                      <span className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {new Date(trip.departureTime).toLocaleTimeString('tr-TR', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {new Date(trip.departureTime).toLocaleDateString('tr-TR')}
                      </span>
                      <span className="flex items-center gap-1">
                        <Bus className="h-4 w-4" /> {bus.model} · {bus.seatLayout?.layout || '2+1'}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-5 md:justify-end">
                    <p className="text-2xl font-bold text-gray-950">
                      {trip.basePrice.toFixed(2)} ₺
                    </p>
                    <Link
                      href={`/trips/${trip.id}`}
                      className="rounded-xl bg-red-700 px-5 py-3 font-semibold text-white hover:bg-red-800"
                    >
                      Seç
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
