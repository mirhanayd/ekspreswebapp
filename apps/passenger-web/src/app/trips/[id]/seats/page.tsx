import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ChevronRight, Armchair } from 'lucide-react';
import SeatSelector from './SeatSelector';
import { API_BASE_URL } from '@/lib/server-api';

export default async function SeatSelectionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let seatMapData;
  let tripData;

  try {
    const [seatRes, tripRes] = await Promise.all([
      fetch(`${API_BASE_URL}/seats/trip/${id}`, { cache: 'no-store' }),
      fetch(`${API_BASE_URL}/transport/trips/${id}`, { cache: 'no-store' }),
    ]);

    if (!seatRes.ok || !tripRes.ok) {
      if (seatRes.status === 404 || tripRes.status === 404) return notFound();
      throw new Error('Failed to load seat data');
    }

    seatMapData = await seatRes.json();
    tripData = await tripRes.json();
  } catch {
    return (
      <div className="p-8 text-center text-red-600">
        <h2>Koltuk bilgileri yüklenemedi.</h2>
      </div>
    );
  }

  const { route } = tripData;

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4 space-y-6">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-gray-500">
          <Link href="/" className="hover:text-gray-700">
            Ana Sayfa
          </Link>
          <ChevronRight className="h-4 w-4" />
          <Link href={`/trips/${id}`} className="hover:text-gray-700">
            Sefer Detayı
          </Link>
          <ChevronRight className="h-4 w-4" />
          <span className="text-gray-900 font-medium">Koltuk Seçimi</span>
        </nav>

        {/* Header */}
        <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Armchair className="h-5 w-5 text-blue-600" /> Koltuk Seçimi
          </h1>
          <p className="text-gray-500 mt-1">
            {route?.origin?.name} → {route?.destination?.name} • {seatMapData.bus.model} (
            {seatMapData.bus.plateNumber})
          </p>
        </div>

        {/* Seat Selector */}
        <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
          <SeatSelector tripId={id} initialData={seatMapData} />
        </div>
      </div>
    </div>
  );
}
