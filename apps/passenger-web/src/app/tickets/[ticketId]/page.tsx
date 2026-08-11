import {
  ArrowLeft,
  ArrowRight,
  Armchair,
  BusFront,
  Clock3,
  QrCode,
  Radio,
  ShieldCheck,
  Ticket as TicketIcon,
  UserRound,
} from 'lucide-react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import QRCode from 'qrcode';
import { authenticatedApiFetch } from '@/lib/server-api';
import { BrandMark } from '@/components/BrandLogo';
import { PrintButton } from '@/components/PrintButton';
import {
  formatDuration,
  formatLongDate,
  formatMinorPrice,
  formatTime,
  minutesBetween,
  ticketStatusLabel,
  tripStatusLabel,
} from '@/lib/format';

export const metadata = { title: 'Bilet detayı' };

type TicketDetail = {
  id: string;
  ticketNo: string;
  status: string;
  issuedAt: string;
  trip: {
    id: string;
    status: string;
    departureTime: string;
    arrivalTime: string;
    bus: { plateNumber: string; model?: string };
    route: { name?: string; origin: { name: string }; destination: { name: string } };
  };
  tripSeat: { seatNo: string };
  order: { passengerFirstName: string; passengerLastName: string; totalMinor?: number };
};

export default async function TicketDetailPage({
  params,
}: {
  params: Promise<{ ticketId: string }>;
}) {
  const { ticketId } = await params;
  let ticket: TicketDetail | null = null;
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
        margin: 1,
        width: 320,
        color: { dark: '#12100E', light: '#FFFFFF' },
      });
      qrExpiresAt = qr.expiresAt;
    }
  } catch (caught) {
    error = caught instanceof Error ? caught.message : 'Bilet yüklenemedi.';
  }

  if (error || !ticket)
    return (
      <div className="page shell grid place-items-center">
        <div className="card max-w-md p-8 text-center">
          <h1 className="title-md">Bilet görüntülenemiyor</h1>
          <p className="subtle mt-2">{error}</p>
          <Link href="/tickets" className="btn btn-secondary mt-6">
            Biletlerime dön
          </Link>
        </div>
      </div>
    );

  const departure = new Date(ticket.trip.departureTime);
  const arrival = new Date(ticket.trip.arrivalTime);
  const duration = minutesBetween(departure, arrival);
  const liveEligible =
    ticket.status === 'active' && ['boarding', 'in_transit'].includes(ticket.trip.status);

  return (
    <div className="page shell">
      <div className="mx-auto max-w-4xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link href="/tickets" className="link-quiet inline-flex items-center gap-1.5 text-sm">
            <ArrowLeft className="h-4 w-4" aria-hidden />
            Biletlerime dön
          </Link>
          <PrintButton />
        </div>

        {/* Boarding pass */}
        <article className="relative mt-3 rounded-3xl border border-ink-200 bg-white shadow-lift">
          <header className="flex flex-wrap items-center justify-between gap-3 rounded-t-3xl bg-ink-950 px-5 py-4 text-white sm:px-7">
            <div className="flex min-w-0 items-center gap-3">
              <BrandMark size="sm" className="w-24" />
              <span className="hidden border-l border-white/15 pl-3 sm:block">
                <span className="block text-2xs font-bold uppercase tracking-[0.16em] text-brand-300">
                  Yolcu bileti
                </span>
                <span className="block text-sm font-semibold text-ink-200">
                  {ticket.trip.route.name ?? 'Şehirlerarası sefer'}
                </span>
              </span>
            </div>
            <div className="text-right">
              <p className="text-2xs font-bold uppercase tracking-wide text-ink-400">Bilet no</p>
              <p className="num text-sm font-bold">{ticket.ticketNo}</p>
            </div>
          </header>

          <div className="grid lg:grid-cols-[minmax(0,1fr)_19rem]">
            {/* Journey */}
            <div className="p-5 sm:p-7">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`badge ${ticket.status === 'active' ? 'badge-live' : 'badge-muted'}`}
                >
                  <ShieldCheck className="h-3 w-3" aria-hidden />
                  {ticketStatusLabel[ticket.status] ?? ticket.status}
                </span>
                <span className="badge badge-muted">
                  {tripStatusLabel[ticket.trip.status] ?? ticket.trip.status}
                </span>
              </div>

              <p className="mt-4 text-sm font-semibold text-ink-500">{formatLongDate(departure)}</p>

              <div className="mt-3 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-start gap-3">
                <div className="min-w-0">
                  <p className="num font-display text-3xl font-extrabold leading-none sm:text-4xl">
                    {formatTime(departure)}
                  </p>
                  <p className="mt-1.5 truncate font-display font-bold text-ink-900">
                    {ticket.trip.route.origin.name}
                  </p>
                  <p className="text-2xs font-semibold uppercase tracking-wide text-ink-500">
                    Kalkış
                  </p>
                </div>

                <div className="flex min-w-16 flex-col items-center gap-1.5 pt-2">
                  <span className="text-2xs font-bold text-ink-500">
                    {formatDuration(duration)}
                  </span>
                  <span className="flex w-full items-center">
                    <span className="rail-dot-start" />
                    <span className="dotted-path" />
                    <BusFront className="mx-1 h-4 w-4 shrink-0 text-brand-600" aria-hidden />
                    <span className="dotted-path" />
                    <span className="rail-dot-end" />
                  </span>
                </div>

                <div className="min-w-0 text-right">
                  <p className="num font-display text-3xl font-extrabold leading-none sm:text-4xl">
                    {formatTime(arrival)}
                  </p>
                  <p className="mt-1.5 truncate font-display font-bold text-ink-900">
                    {ticket.trip.route.destination.name}
                  </p>
                  <p className="text-2xs font-semibold uppercase tracking-wide text-ink-500">
                    Varış
                  </p>
                </div>
              </div>

              <dl className="mt-7 grid grid-cols-2 gap-2.5 border-t border-dashed border-ink-200 pt-6 sm:grid-cols-4">
                <Detail
                  icon={<UserRound aria-hidden />}
                  label="Yolcu"
                  value={`${ticket.order.passengerFirstName} ${ticket.order.passengerLastName}`}
                />
                <Detail
                  icon={<Armchair aria-hidden />}
                  label="Koltuk"
                  value={ticket.tripSeat.seatNo}
                />
                <Detail
                  icon={<BusFront aria-hidden />}
                  label="Araç"
                  value={ticket.trip.bus.plateNumber}
                />
                <Detail
                  icon={<TicketIcon aria-hidden />}
                  label="Ücret"
                  value={
                    typeof ticket.order.totalMinor === 'number'
                      ? formatMinorPrice(ticket.order.totalMinor)
                      : '—'
                  }
                />
              </dl>

              {liveEligible ? (
                <Link
                  href={`/trips/${ticket.trip.id}/live?ticketId=${ticket.id}`}
                  className="btn btn-primary mt-6 w-full sm:w-auto"
                >
                  <Radio className="h-4 w-4" aria-hidden />
                  Otobüsü canlı izle
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </Link>
              ) : (
                <p className="mt-6 flex items-center gap-2 rounded-2xl bg-ink-50 px-3.5 py-3 text-xs font-semibold text-ink-600">
                  <Clock3 className="h-4 w-4 shrink-0 text-ink-400" aria-hidden />
                  Canlı takip, sefer biniş aşamasına geçtiğinde bu ekranda açılır.
                </p>
              )}
            </div>

            {/* QR stub */}
            <div className="relative border-t-2 border-dashed border-ink-200 bg-ink-50 p-5 text-center lg:border-l-2 lg:border-t-0">
              <span
                className="absolute -left-3 -top-3 h-6 w-6 rounded-full bg-background"
                aria-hidden
              />
              <span
                className="absolute -right-3 -top-3 h-6 w-6 rounded-full bg-background lg:hidden"
                aria-hidden
              />
              <span
                className="absolute -bottom-3 -left-3 hidden h-6 w-6 rounded-full bg-background lg:block"
                aria-hidden
              />

              <p className="eyebrow">Biniş kodu</p>
              <div className="mx-auto mt-4 w-full max-w-[13.5rem] rounded-2xl border border-ink-200 bg-white p-3 shadow-card">
                {qrImage ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={qrImage}
                    alt={`${ticket.ticketNo} bilet QR kodu`}
                    width={208}
                    height={208}
                    className="h-auto w-full"
                  />
                ) : (
                  <div className="grid aspect-square place-items-center text-ink-300">
                    <QrCode className="h-20 w-20" aria-hidden />
                  </div>
                )}
              </div>

              <p className="num mt-3 text-sm font-bold text-ink-900">{ticket.ticketNo}</p>
              <p className="mt-2 text-2xs leading-5 text-ink-500">
                Biniş sırasında bu kodu görevliye okutun.
              </p>
              {qrExpiresAt ? (
                <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-white px-2.5 py-1 text-2xs font-bold text-ink-700 ring-1 ring-inset ring-ink-200">
                  <Clock3 className="h-3 w-3" aria-hidden />
                  {formatTime(qrExpiresAt)}&apos;e kadar geçerli
                </p>
              ) : null}
            </div>
          </div>
        </article>

        <p className="mt-4 text-center text-2xs leading-5 text-ink-500">
          Bilet, Siirt Kurtalan Ekspres yolcu hesabınıza tanımlıdır ve yalnızca kayıtlı yolcu
          tarafından kullanılabilir.
        </p>
      </div>
    </div>
  );
}

function Detail({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-2xl bg-ink-50 p-3 ring-1 ring-inset ring-ink-100">
      <span className="text-brand-700 [&>svg]:h-4 [&>svg]:w-4">{icon}</span>
      <dt className="mt-1.5 text-2xs font-bold uppercase tracking-wide text-ink-500">{label}</dt>
      <dd className="mt-0.5 truncate font-display text-sm font-bold text-ink-900">{value}</dd>
    </div>
  );
}
