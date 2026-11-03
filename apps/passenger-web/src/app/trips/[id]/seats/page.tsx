import Link from 'next/link';
import { SeatBooking } from '@/components/seats/SeatBooking';
import { BackButton } from '@/components/nav/BackButton';
import { getTripDetails } from '@/lib/server-transport';
import { getSeatMap } from '@/lib/server-seats';
import { getSessionUser } from '@/lib/session';
import { formatLongDate, formatTime, placeShortName } from '@/lib/format';

export const metadata = { title: 'Koltuk seçimi' };
export const dynamic = 'force-dynamic';

export default async function SeatSelectionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let seatMapData;
  let tripData;
  try {
    [seatMapData, tripData] = await Promise.all([getSeatMap(id), getTripDetails(id)]);
  } catch {
    return (
      <div className="flex min-h-[100dvh] flex-col gap-4 px-4 pt-3.5">
        <BackButton fallback="/search" />
        <div className="surface flex flex-col items-center gap-2 px-6 py-10 text-center">
          <h1 className="m-0 text-lg font-extrabold">Koltuk bilgileri yüklenemedi</h1>
          <p className="m-0 max-w-[260px] text-sm text-sk-ink2">
            Sefer envanterine şu anda ulaşılamıyor. Kısa süre sonra tekrar dene.
          </p>
          <Link href="/search" className="btn btn-brand mt-4">
            Seferlere dön
          </Link>
        </div>
      </div>
    );
  }

  const user = await getSessionUser();
  const originName = tripData.route?.origin?.name ?? 'Kalkış';
  const destinationName = tripData.route?.destination?.name ?? 'Varış';
  const route = `${placeShortName(originName)} → ${placeShortName(destinationName)}`;
  const day = formatLongDate(tripData.departureTime);

  return (
    <div className="flex min-h-[100dvh] flex-col">
      <header className="flex items-center gap-3 px-4 pb-2 pt-3.5">
        <BackButton fallback="/search" />
        <div className="flex min-w-0 flex-col gap-0.5">
          <h1 className="m-0 text-lg font-extrabold">Koltuğunu seç</h1>
          <span className="truncate text-[13px] text-sk-ink2">
            {formatTime(tripData.departureTime)} · {route} · {day}
          </span>
        </div>
      </header>
      <SeatBooking
        tripId={id}
        initialData={seatMapData as never}
        summary={{
          departure: formatTime(tripData.departureTime),
          route,
          meta: day,
        }}
        stopName={destinationName}
        passenger={{
          firstName: user?.firstName ?? '',
          lastName: user?.lastName ?? '',
          phone: '',
          email: user?.email ?? '',
        }}
      />
    </div>
  );
}
