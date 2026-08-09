import { notFound } from 'next/navigation';
import { MapPin, Calendar, Clock, Bus, Map as MapIcon, ChevronRight } from 'lucide-react';

import MapView from './MapView';

// A helper to format time
function formatTime(isoString: string) {
  const date = new Date(isoString);
  return date.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
}

function formatDate(isoString: string) {
  const date = new Date(isoString);
  return date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
}

export default async function TripDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // Fetch trip details from our NestJS API
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';
  let tripData;

  try {
    const res = await fetch(`${apiUrl}/transport/trips/${id}`, {
      // In a real app we might want to revalidate occasionally
      cache: 'no-store',
    });
    if (!res.ok) {
      if (res.status === 404) return notFound();
      throw new Error('Failed to fetch trip data');
    }
    tripData = await res.json();
  } catch (error) {
    console.error(error);
    return (
      <div className="p-8 text-center text-red-600">
        <h2>Sefer bilgileri yüklenemedi.</h2>
      </div>
    );
  }

  const { trip, bus, route } = tripData;
  const stops = route.stops || [];

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4 grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Trip Info & Stops */}
        <div className="lg:col-span-2 space-y-6">
          {/* Header Card */}
          <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                  {route.origin?.name} <ChevronRight className="h-5 w-5 text-gray-400" />{' '}
                  {route.destination?.name}
                </h1>
                <p className="text-gray-500 mt-1 flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  {formatDate(trip.departureTime)}
                </p>
              </div>
              <div className="text-right">
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                  {trip.status === 'scheduled' ? 'Planlandı' : trip.status}
                </span>
                <p className="text-2xl font-bold text-gray-900 mt-2">{trip.basePrice} ₺</p>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 py-4 border-t border-gray-100">
              <div>
                <p className="text-sm text-gray-500 mb-1">Kalkış</p>
                <p className="font-semibold text-gray-900 flex items-center gap-1">
                  <Clock className="h-4 w-4 text-blue-600" />
                  {formatTime(trip.departureTime)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-1">Varış</p>
                <p className="font-semibold text-gray-900 flex items-center gap-1">
                  <Clock className="h-4 w-4 text-green-600" />
                  {formatTime(trip.arrivalTime)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-1">Otobüs</p>
                <p className="font-semibold text-gray-900 flex items-center gap-1">
                  <Bus className="h-4 w-4 text-gray-600" />
                  {bus.plateNumber}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-1">Düzen</p>
                <p className="font-semibold text-gray-900">
                  {bus.seatLayout?.layout || 'Bilinmiyor'}
                </p>
              </div>
            </div>
          </div>

          {/* Timeline / Stops Card */}
          <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
            <h2 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
              <MapPin className="h-5 w-5 text-blue-600" /> Güzergah
            </h2>
            <div className="relative pl-4 space-y-8 before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-300 before:to-transparent">
              {stops.map((stop: any) => {
                return (
                  <div
                    key={stop.id}
                    className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active"
                  >
                    <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-white bg-blue-500 text-slate-100 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
                      <MapPin className="h-4 w-4" />
                    </div>
                    <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-slate-200 bg-white shadow-sm">
                      <div className="flex items-center justify-between space-x-2 mb-1">
                        <div className="font-bold text-slate-900">{stop.location?.name}</div>
                        <time className="font-caveat font-medium text-indigo-500">
                          {/* Calculate approximate time based on estimatedMinutesFromStart */}
                          {/* In a real app we would compute this accurately. For now we just display the offset. */}
                          +{stop.estimatedMinutesFromStart} dk
                        </time>
                      </div>
                      <div className="text-slate-500">
                        {stop.location?.type === 'terminal' ? 'Otogar' : 'Durak'}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Map & Action */}
        <div className="space-y-6">
          <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100 sticky top-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <MapIcon className="h-5 w-5 text-blue-600" /> Harita
            </h2>
            <div className="h-64 rounded-xl overflow-hidden bg-gray-100 border border-gray-200 mb-6">
              <MapView stops={stops} />
            </div>

            <button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-4 px-4 rounded-xl shadow-md transition-colors text-lg">
              Koltuk Seç
            </button>
            <p className="text-sm text-center text-gray-500 mt-4">
              Koltuk seçimi sonraki adımda yapılacaktır.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
