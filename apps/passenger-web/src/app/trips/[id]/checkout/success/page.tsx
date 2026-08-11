import { ArrowRight, Check, Ticket } from 'lucide-react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { authenticatedApiFetch } from '@/lib/server-api';

export default async function CheckoutSuccessPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ orderId?: string }>;
}) {
  const { id } = await params;
  const { orderId } = await searchParams;
  let order: any = null;
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
  return (
    <div className="page-shell">
      <div className="mx-auto max-w-2xl space-y-5">
        <header className="surface-card p-7 text-center sm:p-9">
          <span className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-emerald-100 ring-8 ring-emerald-50">
            <Check className="h-10 w-10 text-emerald-700" />
          </span>
          <p className="eyebrow mt-7">İşlem tamamlandı</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight">Biletiniz hazır!</h1>
          <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-slate-600">
            Demo ödemeniz güvenle tamamlandı. Bilet ve QR kodu hesabınıza eklendi.
          </p>
        </header>
        {order && (
          <article className="overflow-hidden rounded-3xl bg-slate-950 text-white shadow-xl">
            <div className="flex items-center justify-between border-b border-white/10 px-6 py-5">
              <span className="flex items-center gap-2 font-black">
                <Ticket className="h-5 w-5 text-red-400" />
                Siirt Kurtalan Ekspres
              </span>
              <span className="font-mono text-xs text-slate-400">{order.ticket?.ticketNo}</span>
            </div>
            <div className="grid gap-6 p-6 sm:grid-cols-2">
              <div>
                <p className="text-xs uppercase tracking-widest text-slate-500">Güzergâh</p>
                <p className="mt-2 text-xl font-black">
                  {order.trip?.route?.origin?.name} → {order.trip?.route?.destination?.name}
                </p>
                <p className="mt-2 text-sm text-slate-400">{order.trip?.bus?.plateNumber}</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Summary label="Koltuk" value={order.tripSeat?.seatNo} />
                <Summary
                  label="Tutar"
                  value={`${(order.totalMinor / 100).toLocaleString('tr-TR')} ₺`}
                />
                <Summary
                  label="Yolcu"
                  value={`${order.passengerFirstName} ${order.passengerLastName}`}
                />
                <Summary label="Sipariş" value={order.orderNo} />
              </div>
            </div>
          </article>
        )}
        <div className="grid gap-3 sm:grid-cols-2">
          <Link href="/" className="secondary-action">
            Ana sayfa
          </Link>
          <Link
            href={order?.ticket?.id ? `/tickets/${order.ticket.id}` : '/tickets'}
            className="primary-action"
          >
            Bileti ve QR'ı aç <ArrowRight className="h-5 w-5" />
          </Link>
        </div>
      </div>
    </div>
  );
}
function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-white/10 p-3">
      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{label}</p>
      <p className="mt-1 truncate text-sm font-black">{value}</p>
    </div>
  );
}
