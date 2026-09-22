import Link from 'next/link';
import { Armchair, BusFront, CalendarDays, Clock3 } from 'lucide-react';
import CheckoutForm from './CheckoutForm';
import { API_BASE_URL } from '@/lib/server-api';
import { getTripDetails } from '@/lib/server-transport';
import { BookingSteps } from '@/components/BookingSteps';
import { ScreenHeader } from '@/components/ScreenHeader';
import { RoutePanel } from '@/components/RoutePanel';
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
  bus?: { plateNumber?: string; model?: string | null };
  route?: { origin?: { name: string }; destination?: { name: string } };
};

function Guard({
  tripId,
  title,
  body,
  cta,
}: {
  tripId: string;
  title: string;
  body: string;
  cta: string;
}) {
  return (
    <div className="canvas-cream min-h-[100dvh]">
      <div className="screen screen-pad">
        <ScreenHeader backHref={`/trips/${tripId}/seats`} backLabel="Koltuk seçimine dön" />
        <div className="empty-state mt-6">
          <h1 className="title-md">{title}</h1>
          <p className="subtle mt-2 max-w-xs">{body}</p>
          <Link href={`/trips/${tripId}/seats`} className="btn btn-primary mt-6">
            {cta}
          </Link>
        </div>
      </div>
    </div>
  );
}

/**
 * Checkout. Derived from the booking language of `/ui`: cream canvas, circular
 * back control, the tinted route panel as the order header, pill fields, and a
 * near-black total block. Only the presentation changed — the order, payment and
 * price-verification flow is untouched.
 */
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
      <Guard
        tripId={id}
        title="Koltuk seçimi gerekli"
        body="Ödeme adımına geçmeden önce plan üzerinden uygun bir koltuk ayırın."
        cta="Koltuk seçimine dön"
      />
    );

  let trip: TripSummary | null = null;
  let priceMinor: number | null = null;
  try {
    const [tripData, seatResponse] = await Promise.all([
      getTripDetails(id),
      fetch(`${API_BASE_URL}/seats/trip/${id}`, { cache: 'no-store' }),
    ]);
    if (seatResponse.ok) {
      const seats = await seatResponse.json();
      trip = tripData;
      priceMinor =
        seats.seats?.find((seat: { seatNo: string }) => seat.seatNo === seatNo)?.priceMinor ?? null;
    }
  } catch {
    // The verified price guard below prevents checkout with incomplete data.
  }

  if (priceMinor === null)
    return (
      <Guard
        tripId={id}
        title="Koltuk fiyatı doğrulanamadı"
        body="Güvenlik gereği fiyat sunucudan doğrulanmadan ödeme başlatılmaz. Lütfen koltuk seçimini yenileyin."
        cta="Koltuk seçimine dön"
      />
    );

  const originName = trip?.route?.origin?.name ?? 'Kalkış';
  const destinationName = trip?.route?.destination?.name ?? 'Varış';
  const routeName = `${originName} → ${destinationName}`;
  const duration = trip ? minutesBetween(trip.departureTime, trip.arrivalTime) : 0;

  return (
    <div className="canvas-cream min-h-[100dvh]">
      <div className="screen-wide screen-pad">
        <ScreenHeader
          backHref={`/trips/${id}/seats`}
          backLabel="Koltuk seçimine dön"
          title="Yolcu ve ödeme"
        />

        <div className="mt-5">
          <BookingSteps current={3} />
        </div>

        <header className="mt-6">
          <p className="eyebrow">Son adım</p>
          <h1 className="title-lg mt-1.5">Biletinizi tamamlayın</h1>
          <p className="caption mt-1.5">
            Yolcu bilgilerini girin ve sunum ortamındaki demo ödemeyi onaylayın.
          </p>
        </header>

        <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_21rem] lg:items-start lg:gap-6">
          <div className="card card-pad order-last min-w-0 lg:order-none">
            <CheckoutForm
              tripId={id}
              seatNo={seatNo}
              holdId={holdId}
              priceMinor={priceMinor}
              routeName={routeName}
            />
          </div>

          <aside className="min-w-0 lg:sticky lg:top-[calc(var(--app-header-h)+1rem)]">
            <section aria-label="Sipariş özeti">
              <RoutePanel originName={originName} destinationName={destinationName} compact />

              <dl className="facts-strip mt-3 overflow-hidden rounded-[1.25rem]">
                <div className="fact">
                  <dt className="fact-label">Koltuk</dt>
                  <dd className="fact-value">{seatNo}</dd>
                </div>
                <div className="fact">
                  <dt className="fact-label">Süre</dt>
                  <dd className="fact-value">{formatDuration(duration)}</dd>
                </div>
                <div className="fact">
                  <dt className="fact-label">Araç</dt>
                  <dd className="fact-value">{trip?.bus?.plateNumber ?? '—'}</dd>
                </div>
              </dl>

              {trip ? (
                <ul className="mt-3 space-y-2.5 rounded-[1.25rem] bg-white p-4 shadow-card">
                  <SummaryRow
                    icon={<CalendarDays aria-hidden />}
                    label="Tarih"
                    value={formatLongDate(trip.departureTime)}
                  />
                  <SummaryRow
                    icon={<Clock3 aria-hidden />}
                    label="Kalkış – varış"
                    value={`${formatTime(trip.departureTime)} – ${formatTime(trip.arrivalTime)}`}
                  />
                  <SummaryRow
                    icon={<BusFront aria-hidden />}
                    label="Araç"
                    value={trip.bus?.model ?? 'Konfor sınıfı otobüs'}
                  />
                  <SummaryRow
                    icon={<Armchair aria-hidden />}
                    label="Koltuk"
                    value={`${seatNo} numara`}
                  />
                </ul>
              ) : null}

              <div className="panel-dark mt-3 p-5">
                <div className="flex items-center justify-between text-sm text-white/60">
                  <span>1 × Tam bilet</span>
                  <span className="num">{formatMinorPrice(priceMinor)}</span>
                </div>
                <div className="mt-2 flex items-center justify-between text-sm text-white/60">
                  <span>Hizmet bedeli</span>
                  <span>Yok</span>
                </div>
                <div className="mt-4 flex items-baseline justify-between border-t border-white/10 pt-4">
                  <span className="font-display text-[0.9375rem] font-bold text-white">Toplam</span>
                  <span className="num font-display text-[1.75rem] font-bold text-lime-400">
                    {formatMinorPrice(priceMinor)}
                  </span>
                </div>
                <p className="mt-2 text-[0.6875rem] text-white/45">Vergiler dahildir.</p>
              </div>
            </section>
          </aside>
        </div>
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
    <li className="flex items-center justify-between gap-3">
      <span className="flex shrink-0 items-center gap-2.5 text-[0.8125rem] text-ink-500">
        <span className="text-ink-400 [&>svg]:h-4 [&>svg]:w-4">{icon}</span>
        {label}
      </span>
      <span className="min-w-0 truncate text-[0.8125rem] font-semibold text-ink-900">{value}</span>
    </li>
  );
}
