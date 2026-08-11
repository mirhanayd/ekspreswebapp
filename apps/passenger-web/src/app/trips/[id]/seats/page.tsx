import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowRight, Armchair } from 'lucide-react';
import SeatSelector from './SeatSelector';
import { API_BASE_URL } from '@/lib/server-api';

export default async function SeatSelectionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let seatMapData;
  let tripData;
  try {
    const [seats, trip] = await Promise.all([
      fetch(`${API_BASE_URL}/seats/trip/${id}`, { cache: 'no-store' }),
      fetch(`${API_BASE_URL}/transport/trips/${id}`, { cache: 'no-store' }),
    ]);
    if (seats.status === 404 || trip.status === 404) notFound();
    if (!seats.ok || !trip.ok) throw new Error();
    seatMapData = await seats.json();
    tripData = await trip.json();
  } catch {
    return (
      <div className="page-shell grid place-items-center">
        <p className="rounded-xl bg-red-50 p-5 font-semibold text-red-800">
          Koltuk bilgileri yüklenemedi.
        </p>
      </div>
    );
  }
  return (
    <div className="page-shell">
      <div className="mx-auto max-w-5xl space-y-5">
        <nav className="flex items-center gap-2 text-sm font-semibold text-slate-500">
          <Link href={`/trips/${id}`} className="hover:text-red-700">
            Sefer detayı
          </Link>
          <ArrowRight className="h-4 w-4" />
          <span className="text-slate-900">Koltuk seçimi</span>
        </nav>
        <header className="rounded-2xl bg-slate-950 p-6 text-white sm:flex sm:items-center sm:justify-between">
          <div>
            <p className="eyebrow !text-red-400">2+1 konfor düzeni</p>
            <h1 className="mt-2 flex items-center gap-2 text-2xl font-black">
              <Armchair className="h-6 w-6" /> Koltuğunuzu seçin
            </h1>
            <p className="mt-2 text-sm text-slate-300">
              {tripData.route?.origin?.name} → {tripData.route?.destination?.name}
            </p>
          </div>
          <div className="mt-4 text-sm text-slate-300 sm:mt-0 sm:text-right">
            <p className="font-bold text-white">{seatMapData.bus.model}</p>
            <p>{seatMapData.bus.plateNumber}</p>
          </div>
        </header>
        <div className="surface-card p-4 sm:p-7">
          <SeatSelector tripId={id} initialData={seatMapData} />
        </div>
      </div>
    </div>
  );
}
