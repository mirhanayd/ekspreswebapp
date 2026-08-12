import { notFound } from 'next/navigation';
import Link from 'next/link';
import SeatSelector from './SeatSelector';
import { API_BASE_URL } from '@/lib/server-api';
import { BookingSteps } from '@/components/BookingSteps';
import { ScreenHeader } from '@/components/ScreenHeader';
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
      <div className="canvas-cream min-h-[100dvh]">
        <div className="screen screen-pad">
          <ScreenHeader backHref={`/trips/${id}`} backLabel="Sefer detayına dön" />
          <div className="empty-state mt-6">
            <h1 className="title-md">Koltuk bilgileri yüklenemedi</h1>
            <p className="subtle mt-2 max-w-xs">
              Sefer envanterine şu anda ulaşılamıyor. Kısa süre sonra tekrar deneyin.
            </p>
            <Link href={`/trips/${id}`} className="btn btn-primary mt-6">
              Sefer detayına dön
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const originName = tripData.route?.origin?.name ?? 'Kalkış';
  const destinationName = tripData.route?.destination?.name ?? 'Varış';

  return (
    <div className="canvas-cream min-h-[100dvh]">
      <div className="screen-wide screen-pad pb-44 lg:pb-14">
        <ScreenHeader
          backHref={`/trips/${id}`}
          backLabel="Sefer detayına dön"
          title="Koltuk seçimi"
        />

        <div className="mt-5">
          <BookingSteps current={2} />
        </div>

        <header className="mt-6">
          <p className="eyebrow">{seatMapData.seatLayout?.layout || '2+1'} konfor düzeni</p>
          <h1 className="title-lg mt-1.5">Koltuğunu seç</h1>
          <p className="caption mt-1.5">
            {placeShortName(originName)} – {placeShortName(destinationName)} ·{' '}
            {formatLongDate(tripData.departureTime)} · {formatTime(tripData.departureTime)} ·{' '}
            {seatMapData.bus.plateNumber}
          </p>
        </header>

        <div className="mt-5">
          <SeatSelector tripId={id} initialData={seatMapData} />
        </div>
      </div>
    </div>
  );
}
