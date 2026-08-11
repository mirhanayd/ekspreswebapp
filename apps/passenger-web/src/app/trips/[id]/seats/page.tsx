import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import SeatSelector from './SeatSelector';
import { API_BASE_URL } from '@/lib/server-api';
import { BookingSteps } from '@/components/BookingSteps';
import { formatLongDate, formatTime, placeShortName } from '@/lib/format';

export const metadata = { title: 'Koltuk seçimi' };

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
      <div className="page shell grid place-items-center">
        <div className="card max-w-md p-8 text-center">
          <h1 className="title-md">Koltuk bilgileri yüklenemedi</h1>
          <p className="subtle mt-2">
            Sefer envanterine şu anda ulaşılamıyor. Kısa süre sonra tekrar deneyin.
          </p>
          <Link href={`/trips/${id}`} className="btn btn-secondary mt-6">
            Sefer detayına dön
          </Link>
        </div>
      </div>
    );
  }

  const originName = tripData.route?.origin?.name ?? 'Kalkış';
  const destinationName = tripData.route?.destination?.name ?? 'Varış';

  return (
    <div className="page shell pb-28 lg:pb-10">
      <div className="app-topbar">
        <Link
          href={`/trips/${id}`}
          aria-label="Sefer detayına dön"
          className="icon-btn icon-btn-light"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
        </Link>
        <p className="font-display text-sm font-bold text-ink-800">Koltuk seçimi</p>
        <span className="h-11 w-11" aria-hidden />
      </div>

      <div className="card mt-3 p-4 sm:p-5">
        <BookingSteps current={2} />
      </div>

      <header className="panel panel-sheen mt-4 p-5 sm:p-6">
        <div className="relative flex flex-wrap items-end justify-between gap-4">
          <div className="min-w-0">
            <p className="eyebrow-invert">
              {seatMapData.seatLayout?.layout || '2+1'} konfor düzeni
            </p>
            <h1 className="title-lg mt-1.5 truncate text-white">Koltuğunuzu seçin</h1>
            <p className="mt-2 truncate text-sm text-ink-300">
              {placeShortName(originName)} → {placeShortName(destinationName)} ·{' '}
              {formatLongDate(tripData.departureTime)} · {formatTime(tripData.departureTime)}
            </p>
          </div>
          <div className="relative shrink-0 rounded-2xl border border-white/15 bg-white/10 px-3.5 py-2 text-right">
            <p className="text-sm font-bold">{seatMapData.bus.model}</p>
            <p className="text-xs text-ink-300">{seatMapData.bus.plateNumber}</p>
          </div>
        </div>
      </header>

      <div className="mt-4">
        <SeatSelector tripId={id} initialData={seatMapData} />
      </div>
    </div>
  );
}
