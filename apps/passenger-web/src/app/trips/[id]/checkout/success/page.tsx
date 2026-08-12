import { ArrowRight, Check } from 'lucide-react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { authenticatedApiFetch } from '@/lib/server-api';
import { BookingSteps } from '@/components/BookingSteps';
import { RoutePanel } from '@/components/RoutePanel';
import { formatLongDate, formatMinorPrice, formatTime } from '@/lib/format';

export const metadata = { title: 'Ödeme tamamlandı' };

type OrderSummary = {
  orderNo: string;
  totalMinor: number;
  passengerFirstName: string;
  passengerLastName: string;
  ticket?: { id: string; ticketNo: string };
  tripSeat?: { seatNo: string };
  trip?: {
    departureTime: string;
    arrivalTime: string;
    bus?: { plateNumber?: string };
    route?: { origin?: { name: string }; destination?: { name: string } };
  };
};

/**
 * Confirmation. Same booking language as the rest of the flow: cream canvas, a
 * lime confirmation mark, the tinted route panel and a #FFFA93 facts strip.
 */
export default async function CheckoutSuccessPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ orderId?: string }>;
}) {
  const { id } = await params;
  const { orderId } = await searchParams;
  let order: OrderSummary | null = null;

  const response = orderId ? await authenticatedApiFetch(`/checkout/order/${orderId}`) : null;
  if (!response || response.status === 401)
    redirect(
      `/login?returnTo=${encodeURIComponent(`/trips/${id}/checkout/success?orderId=${orderId || ''}`)}`,
    );
  try {
    if (response.ok) order = await response.json();
  } catch {
    // The confirmation shell remains available while order details are unavailable.
  }

  const trip = order?.trip;

  return (
    <div className="canvas-cream min-h-[100dvh]">
      <div className="screen screen-pad">
        <BookingSteps current={4} />

        <header className="mt-8 text-center">
          <span className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-lime-400">
            <Check className="h-10 w-10 text-ink-900" aria-hidden />
          </span>
          <p className="eyebrow mt-6 justify-center">İşlem tamamlandı</p>
          <h1 className="title-lg mt-1.5">Biletiniz hazır!</h1>
          <p className="subtle mx-auto mt-2 max-w-sm">
            Demo ödemeniz onaylandı. Bilet ve biniş QR kodu hesabınıza eklendi.
          </p>
        </header>

        {order ? (
          <section className="mt-7" aria-label="Sipariş özeti">
            <RoutePanel
              originName={trip?.route?.origin?.name ?? 'Kalkış'}
              destinationName={trip?.route?.destination?.name ?? 'Varış'}
            >
              {trip ? (
                <p className="text-center text-[0.8125rem] font-semibold text-ink-600">
                  {formatLongDate(trip.departureTime)} · {formatTime(trip.departureTime)} –{' '}
                  {formatTime(trip.arrivalTime)}
                </p>
              ) : null}
            </RoutePanel>

            <dl className="facts-strip mt-3 overflow-hidden rounded-[1.25rem]">
              <div className="fact">
                <dt className="fact-label">Koltuk</dt>
                <dd className="fact-value">{order.tripSeat?.seatNo ?? '—'}</dd>
              </div>
              <div className="fact">
                <dt className="fact-label">Araç</dt>
                <dd className="fact-value">{trip?.bus?.plateNumber ?? '—'}</dd>
              </div>
              <div className="fact">
                <dt className="fact-label">Tutar</dt>
                <dd className="fact-value">{formatMinorPrice(order.totalMinor)}</dd>
              </div>
            </dl>

            <div className="mt-3 rounded-[1.25rem] bg-white p-4 shadow-card">
              <div className="flex items-center justify-between gap-3">
                <span className="text-[0.8125rem] text-ink-500">Yolcu</span>
                <span className="truncate text-[0.8125rem] font-semibold text-ink-900">
                  {order.passengerFirstName} {order.passengerLastName}
                </span>
              </div>
              <div className="mt-2 flex items-center justify-between gap-3">
                <span className="text-[0.8125rem] text-ink-500">Bilet no</span>
                <span className="num truncate text-[0.8125rem] font-semibold text-ink-900">
                  {order.ticket?.ticketNo ?? '—'}
                </span>
              </div>
              <div className="mt-2 flex items-center justify-between gap-3">
                <span className="text-[0.8125rem] text-ink-500">Sipariş no</span>
                <span className="num truncate text-[0.8125rem] font-semibold text-ink-900">
                  {order.orderNo}
                </span>
              </div>
            </div>
          </section>
        ) : (
          <p className="alert-info mt-7">
            Sipariş özeti şu anda görüntülenemiyor. Biletinize Biletlerim ekranından
            ulaşabilirsiniz.
          </p>
        )}

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <Link
            href={order?.ticket?.id ? `/tickets/${order.ticket.id}` : '/tickets'}
            className="btn btn-primary sm:order-last"
          >
            Bileti ve QR&apos;ı aç
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
          <Link href="/" className="btn btn-quiet">
            Ana sayfa
          </Link>
        </div>
      </div>
    </div>
  );
}
