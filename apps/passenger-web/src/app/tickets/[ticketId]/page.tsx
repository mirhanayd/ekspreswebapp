import {
  ArrowRight,
  BusFront,
  CalendarDays,
  Clock3,
  Map,
  QrCode,
  Ticket,
  UserRound,
} from 'lucide-react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import QRCode from 'qrcode';
import { authenticatedApiFetch } from '@/lib/server-api';

export default async function TicketDetailPage({
  params,
}: {
  params: Promise<{ ticketId: string }>;
}) {
  const { ticketId } = await params;
  let ticket: any = null;
  let qrImage: string | null = null;
  let qrExpiresAt: string | null = null;
  let error: string | null = null;
  const response = await authenticatedApiFetch(`/tickets/${ticketId}`);
  if (!response || response.status === 401) redirect(`/login?returnTo=/tickets/${ticketId}`);
  try {
    if (!response.ok) throw new Error('Bilet bulunamadı veya erişim yetkiniz yok.');
    ticket = await response.json();
    const qrResponse = await authenticatedApiFetch(`/tickets/${ticketId}/qr`);
    if (qrResponse?.ok) {
      const qr = await qrResponse.json();
      qrImage = await QRCode.toDataURL(qr.payload, {
        errorCorrectionLevel: 'M',
        margin: 2,
        width: 256,
      });
      qrExpiresAt = qr.expiresAt;
    }
  } catch (caught) {
    error = caught instanceof Error ? caught.message : 'Bilet yüklenemedi.';
  }
  if (error || !ticket)
    return (
      <div className="page-shell grid place-items-center">
        <div className="surface-card p-8 text-center">
          <p className="font-semibold text-red-800">{error}</p>
          <Link href="/tickets" className="secondary-action mt-5">
            Biletlerime dön
          </Link>
        </div>
      </div>
    );
  const departure = new Date(ticket.trip.departureTime);
  const arrival = new Date(ticket.trip.arrivalTime);
  const liveEligible =
    ticket.status === 'active' && ['boarding', 'in_transit'].includes(ticket.trip.status);
  const formatTime = (date: Date) =>
    date.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
  return (
    <div className="page-shell">
      <div className="mx-auto max-w-4xl space-y-5">
        <Link href="/tickets" className="text-sm font-bold text-red-700">
          ← Biletlerime dön
        </Link>
        <article className="overflow-hidden rounded-3xl border border-stone-200 bg-white shadow-xl">
          <header className="flex flex-wrap items-center justify-between gap-4 bg-slate-950 px-6 py-5 text-white sm:px-8">
            <div className="flex items-center gap-3">
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-red-700">
                <Ticket />
              </span>
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-red-400">
                  Yolcu bileti
                </p>
                <p className="font-black">Siirt Kurtalan Ekspres</p>
              </div>
            </div>
            <p className="font-mono text-sm font-bold text-slate-300">{ticket.ticketNo}</p>
          </header>
          <div className="grid lg:grid-cols-[1fr_310px]">
            <div className="p-6 sm:p-8">
              <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
                <div>
                  <p className="text-3xl font-black tabular-nums">{formatTime(departure)}</p>
                  <p className="mt-1 font-black">{ticket.trip.route.origin.name}</p>
                  <p className="text-xs text-slate-500">
                    {departure.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' })}
                  </p>
                </div>
                <div className="flex min-w-20 items-center">
                  <span className="h-2 w-2 rounded-full bg-red-700" />
                  <span className="h-px w-12 bg-stone-300 sm:w-20" />
                  <ArrowRight className="h-5 w-5 text-red-700" />
                  <span className="h-px w-12 bg-stone-300 sm:w-20" />
                  <span className="h-2 w-2 rounded-full bg-slate-700" />
                </div>
                <div className="text-right">
                  <p className="text-3xl font-black tabular-nums">{formatTime(arrival)}</p>
                  <p className="mt-1 font-black">{ticket.trip.route.destination.name}</p>
                  <p className="text-xs text-slate-500">
                    {arrival.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' })}
                  </p>
                </div>
              </div>
              <div className="mt-8 grid gap-3 border-t border-dashed border-stone-300 pt-6 sm:grid-cols-2">
                <Detail
                  icon={<UserRound />}
                  label="Yolcu"
                  value={`${ticket.order.passengerFirstName} ${ticket.order.passengerLastName}`}
                />
                <Detail icon={<Ticket />} label="Koltuk" value={ticket.tripSeat.seatNo} />
                <Detail icon={<BusFront />} label="Otobüs" value={ticket.trip.bus.plateNumber} />
                <Detail
                  icon={<CalendarDays />}
                  label="Durum"
                  value={
                    ticket.status === 'active'
                      ? 'Aktif'
                      : ticket.status === 'used'
                        ? 'Kullanıldı'
                        : 'İptal'
                  }
                />
              </div>
              {liveEligible && (
                <Link
                  href={`/trips/${ticket.trip.id}/live?ticketId=${ticket.id}`}
                  className="primary-action mt-7 w-full sm:w-auto"
                >
                  <Map className="h-5 w-5" /> Otobüsü canlı izle
                </Link>
              )}
            </div>
            <aside className="border-t border-dashed border-stone-300 bg-stone-50 p-6 text-center lg:border-l lg:border-t-0">
              <p className="eyebrow">Biniş kodu</p>
              <div className="mx-auto mt-4 grid h-56 w-56 place-items-center rounded-2xl border bg-white p-3 shadow-sm">
                {qrImage ? (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={qrImage}
                      alt={`${ticket.ticketNo} bilet QR kodu`}
                      width={208}
                      height={208}
                    />
                  </>
                ) : (
                  <QrCode className="h-28 w-28 text-stone-300" />
                )}
              </div>
              <p className="mt-4 text-xs leading-5 text-slate-500">
                Kontrol sırasında bu ekranı görevliye gösterin.
                {qrExpiresAt && (
                  <span className="block font-semibold">
                    Kod{' '}
                    {new Date(qrExpiresAt).toLocaleTimeString('tr-TR', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}{' '}
                    saatine kadar geçerli.
                  </span>
                )}
              </p>
            </aside>
          </div>
        </article>
        {!liveEligible && (
          <p className="flex items-center justify-center gap-2 text-sm text-slate-500">
            <Clock3 className="h-4 w-4" /> Canlı takip biniş başladığında açılır.
          </p>
        )}
      </div>
    </div>
  );
}

function Detail({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-xl bg-stone-50 p-4">
      <span className="text-red-700 [&>svg]:h-5 [&>svg]:w-5">{icon}</span>
      <p className="mt-2 text-xs font-semibold text-slate-500">{label}</p>
      <p className="font-black">{value}</p>
    </div>
  );
}
