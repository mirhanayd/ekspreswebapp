import { ArrowRight, Armchair, BusFront, Check, Download, Ticket, UserRound } from 'lucide-react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { authenticatedApiFetch } from '@/lib/server-api';
import { BookingSteps } from '@/components/BookingSteps';
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
    <div className="page shell">
      <div className="mx-auto max-w-2xl">
        <div className="card p-4 sm:p-5">
          <BookingSteps current={4} />
        </div>

        <header className="mt-4 text-center">
          <span className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-emerald-100 ring-8 ring-emerald-50">
            <Check className="h-10 w-10 text-emerald-700" aria-hidden />
          </span>
          <p className="eyebrow mt-6">İşlem tamamlandı</p>
          <h1 className="title-lg mt-1.5">Biletiniz hazır!</h1>
          <p className="subtle mx-auto mt-2 max-w-md">
            Demo ödemeniz onaylandı. Bilet ve biniş QR kodu hesabınıza eklendi; yolculuktan önce
            Biletlerim ekranından erişebilirsiniz.
          </p>
        </header>

        {order ? (
          <article className="panel mt-6">
            <div className="flex items-center justify-between gap-3 border-b border-white/10 px-5 py-4">
              <span className="flex min-w-0 items-center gap-2 font-display font-bold">
                <Ticket className="h-4 w-4 shrink-0 text-brand-400" aria-hidden />
                <span className="truncate">Siirt Kurtalan Ekspres</span>
              </span>
              <span className="num shrink-0 text-xs font-semibold text-ink-300">
                {order.ticket?.ticketNo}
              </span>
            </div>

            <div className="p-5">
              {trip ? (
                <>
                  <p className="eyebrow-invert">Güzergâh</p>
                  <p className="mt-2 flex min-w-0 flex-wrap items-center gap-x-2.5 font-display text-xl font-extrabold">
                    <span className="truncate">{trip.route?.origin?.name}</span>
                    <ArrowRight className="h-5 w-5 shrink-0 text-brand-400" aria-hidden />
                    <span className="truncate">{trip.route?.destination?.name}</span>
                  </p>
                  <p className="mt-1.5 text-sm text-ink-300">
                    {formatLongDate(trip.departureTime)} · {formatTime(trip.departureTime)} –{' '}
                    {formatTime(trip.arrivalTime)}
                  </p>
                </>
              ) : null}

              <dl className="mt-5 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                <Summary
                  icon={<Armchair aria-hidden />}
                  label="Koltuk"
                  value={order.tripSeat?.seatNo ?? '—'}
                />
                <Summary
                  icon={<UserRound aria-hidden />}
                  label="Yolcu"
                  value={`${order.passengerFirstName} ${order.passengerLastName}`}
                />
                <Summary
                  icon={<BusFront aria-hidden />}
                  label="Araç"
                  value={trip?.bus?.plateNumber ?? '—'}
                />
                <Summary
                  icon={<Download aria-hidden />}
                  label="Tutar"
                  value={formatMinorPrice(order.totalMinor)}
                />
              </dl>

              <p className="mt-4 text-2xs text-ink-400">Sipariş no: {order.orderNo}</p>
            </div>
          </article>
        ) : (
          <p className="alert-info mt-6">
            Sipariş özeti şu anda görüntülenemiyor. Biletinize Biletlerim ekranından
            ulaşabilirsiniz.
          </p>
        )}

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <Link href="/" className="btn btn-secondary">
            Ana sayfa
          </Link>
          <Link
            href={order?.ticket?.id ? `/tickets/${order.ticket.id}` : '/tickets'}
            className="btn btn-primary"
          >
            Bileti ve QR&apos;ı aç
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </div>
      </div>
    </div>
  );
}

function Summary({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="min-w-0 rounded-2xl bg-white/10 p-3">
      <span className="text-brand-300 [&>svg]:h-3.5 [&>svg]:w-3.5">{icon}</span>
      <dt className="mt-1.5 text-2xs font-bold uppercase tracking-wide text-ink-400">{label}</dt>
      <dd className="mt-0.5 truncate text-sm font-bold">{value}</dd>
    </div>
  );
}
