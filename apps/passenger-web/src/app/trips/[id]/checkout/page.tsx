import { ArrowLeft, ArrowRight, Armchair, BusFront, CalendarDays, Clock3 } from 'lucide-react';
import Link from 'next/link';
import CheckoutForm from './CheckoutForm';
import { API_BASE_URL } from '@/lib/server-api';
import { BookingSteps } from '@/components/BookingSteps';
import {
  formatDuration,
  formatLongDate,
  formatMinorPrice,
  formatTime,
  minutesBetween,
} from '@/lib/format';

export const metadata = { title: 'Yolcu ve ödeme' };

type TripSummary = {
  departureTime: string;
  arrivalTime: string;
  bus?: { plateNumber?: string; model?: string };
  route?: { origin?: { name: string }; destination?: { name: string } };
};

export default async function CheckoutPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ seatNo?: string; holdId?: string }>;
}) {
  const { id } = await params;
  const { seatNo, holdId } = await searchParams;

  if (!seatNo || !holdId)
    return (
      <div className="page shell grid place-items-center">
        <div className="card max-w-md p-8 text-center">
          <h1 className="title-md">Koltuk seçimi gerekli</h1>
          <p className="subtle mt-2">
            Ödeme adımına geçmeden önce plan üzerinden uygun bir koltuk ayırın.
          </p>
          <Link href={`/trips/${id}/seats`} className="btn btn-primary mt-6">
            Koltuk seçimine dön
          </Link>
        </div>
      </div>
    );

  let trip: TripSummary | null = null;
  let priceMinor: number | null = null;
  try {
    const [tripResponse, seatResponse] = await Promise.all([
      fetch(`${API_BASE_URL}/transport/trips/${id}`, { cache: 'no-store' }),
      fetch(`${API_BASE_URL}/seats/trip/${id}`, { cache: 'no-store' }),
    ]);
    if (tripResponse.ok && seatResponse.ok) {
      const [tripData, seats] = await Promise.all([tripResponse.json(), seatResponse.json()]);
      trip = tripData;
      priceMinor =
        seats.seats?.find((seat: { seatNo: string }) => seat.seatNo === seatNo)?.priceMinor ?? null;
    }
  } catch {
    // The verified price guard below prevents checkout with incomplete data.
  }

  if (priceMinor === null)
    return (
      <div className="page shell grid place-items-center">
        <div className="card max-w-md p-8 text-center">
          <h1 className="title-md">Koltuk fiyatı doğrulanamadı</h1>
          <p className="subtle mt-2">
            Güvenlik gereği fiyat sunucudan doğrulanmadan ödeme başlatılmaz. Lütfen koltuk seçimini
            yenileyin.
          </p>
          <Link href={`/trips/${id}/seats`} className="btn btn-secondary mt-6">
            Koltuk seçimine dön
          </Link>
        </div>
      </div>
    );

  const originName = trip?.route?.origin?.name ?? 'Kalkış';
  const destinationName = trip?.route?.destination?.name ?? 'Varış';
  const routeName = `${originName} → ${destinationName}`;
  const duration = trip ? minutesBetween(trip.departureTime, trip.arrivalTime) : 0;

  return (
    <div className="page shell">
      <div className="app-topbar">
        <Link
          href={`/trips/${id}/seats`}
          aria-label="Koltuk seçimine dön"
          className="icon-btn icon-btn-light"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
        </Link>
        <p className="font-display text-sm font-bold text-ink-800">Yolcu ve ödeme</p>
        <span className="h-11 w-11" aria-hidden />
      </div>

      <div className="card mt-3 p-4 sm:p-5">
        <BookingSteps current={3} />
      </div>

      <header className="mt-4">
        <p className="eyebrow">Son adım</p>
        <h1 className="title-lg mt-1">Biletinizi tamamlayın</h1>
        <p className="subtle mt-1.5">
          Yolcu bilgilerini girin ve sunum ortamındaki demo ödemeyi onaylayın.
        </p>
      </header>

      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_21rem] lg:items-start">
        <div className="card p-5 sm:p-6">
          <CheckoutForm
            tripId={id}
            seatNo={seatNo}
            holdId={holdId}
            priceMinor={priceMinor}
            routeName={routeName}
          />
        </div>

        <aside className="order-first lg:order-none lg:sticky lg:top-[calc(var(--app-header-h)+1rem)]">
          <section className="card overflow-hidden" aria-label="Sipariş özeti">
            <div className="bg-ink-950 p-5 text-white">
              <p className="eyebrow-invert">Sipariş özeti</p>
              <p className="mt-2 flex min-w-0 flex-wrap items-center gap-x-2 font-display text-lg font-bold">
                <span className="truncate">{originName}</span>
                <ArrowRight className="h-4 w-4 shrink-0 text-brand-400" aria-hidden />
                <span className="truncate">{destinationName}</span>
              </p>
              {trip ? (
                <p className="mt-1.5 text-sm text-ink-300">
                  {formatLongDate(trip.departureTime)} · {formatTime(trip.departureTime)} –{' '}
                  {formatTime(trip.arrivalTime)}
                </p>
              ) : null}
            </div>

            <dl className="divide-y divide-ink-100">
              <SummaryRow
                icon={<Armchair aria-hidden />}
                label="Koltuk"
                value={`${seatNo} numara`}
              />
              {trip ? (
                <SummaryRow
                  icon={<Clock3 aria-hidden />}
                  label="Yolculuk süresi"
                  value={formatDuration(duration)}
                />
              ) : null}
              {trip?.bus?.plateNumber ? (
                <SummaryRow
                  icon={<BusFront aria-hidden />}
                  label="Araç"
                  value={trip.bus.plateNumber}
                />
              ) : null}
              {trip ? (
                <SummaryRow
                  icon={<CalendarDays aria-hidden />}
                  label="Kalkış"
                  value={formatTime(trip.departureTime)}
                />
              ) : null}
            </dl>

            <div className="border-t border-ink-100 bg-ink-50 p-5">
              <div className="flex items-center justify-between text-sm font-semibold text-ink-600">
                <span>1 × Tam bilet</span>
                <span className="num">{formatMinorPrice(priceMinor)}</span>
              </div>
              <div className="mt-2 flex items-center justify-between text-sm font-semibold text-ink-600">
                <span>Hizmet bedeli</span>
                <span>Yok</span>
              </div>
              <div className="mt-3 flex items-baseline justify-between border-t border-ink-200 pt-3">
                <span className="font-display text-base font-bold">Toplam</span>
                <span className="num font-display text-2xl font-extrabold text-brand-700">
                  {formatMinorPrice(priceMinor)}
                </span>
              </div>
              <p className="mt-2 text-2xs text-ink-500">Vergiler dahildir.</p>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}

function SummaryRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 px-5 py-3">
      <dt className="flex items-center gap-2.5 text-sm font-medium text-ink-600">
        <span className="text-ink-400 [&>svg]:h-4 [&>svg]:w-4">{icon}</span>
        {label}
      </dt>
      <dd className="truncate text-sm font-bold text-ink-900">{value}</dd>
    </div>
  );
}
