import { ArrowRight, BusFront, Clock3, QrCode, Radio, ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import QRCode from 'qrcode';
import { authenticatedApiFetch } from '@/lib/server-api';
import { BrandMark } from '@/components/BrandLogo';
import { PrintButton } from '@/components/PrintButton';
import { ScreenHeader } from '@/components/ScreenHeader';
import {
  formatDuration,
  formatLongDate,
  formatMinorPrice,
  formatTime,
  minutesBetween,
  placeCodeClass,
  placeShortName,
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

/**
 * Boarding pass. The rail-and-facts journey card from `/ui` extended into a
 * full ticket: a near-black header carrying the wordmark, the journey block, a
 * #FFFA93 facts strip, and a perforated QR stub.
 */
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
        color: { dark: '#051A09', light: '#FFFFFF' },
      });
      qrExpiresAt = qr.expiresAt;
    }
  } catch (caught) {
    error = caught instanceof Error ? caught.message : 'Bilet yüklenemedi.';
  }

  if (error || !ticket)
    return (
      <div className="canvas-sage min-h-[100dvh]">
        <div className="screen screen-pad">
          <ScreenHeader backHref="/tickets" backLabel="Biletlerime dön" />
          <div className="empty-state mt-6">
            <h1 className="title-md">Bilet görüntülenemiyor</h1>
            <p className="subtle mt-2 max-w-xs">{error}</p>
            <Link href="/tickets" className="btn btn-primary mt-6">
              Biletlerime dön
            </Link>
          </div>
        </div>
      </div>
    );

  const departure = new Date(ticket.trip.departureTime);
  const arrival = new Date(ticket.trip.arrivalTime);
  const duration = minutesBetween(departure, arrival);
  const liveEligible =
    ticket.status === 'active' && ['boarding', 'in_transit'].includes(ticket.trip.status);

  return (
    <div className="canvas-sage min-h-[100dvh]">
      <div className="screen screen-pad lg:max-w-4xl">
        <ScreenHeader
          backHref="/tickets"
          backLabel="Biletlerime dön"
          title="Biniş biletim"
          action={<PrintButton />}
        />

        <h1 className="sr-only">
          {ticket.ticketNo} · {ticket.trip.route.origin.name} – {ticket.trip.route.destination.name}
        </h1>

        <article className="mt-6 overflow-hidden rounded-[1.75rem] bg-white shadow-lift lg:grid lg:grid-cols-[minmax(0,1fr)_18rem]">
          <div className="min-w-0">
            <header className="flex items-center justify-between gap-3 bg-ink-900 px-5 py-4">
              <BrandMark className="w-24" tone="light" />
              <div className="text-right">
                <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.14em] text-white/45">
                  Bilet no
                </p>
                <p className="num text-[0.8125rem] font-bold text-white">{ticket.ticketNo}</p>
              </div>
            </header>

            <div className="px-5 py-5">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`badge ${ticket.status === 'active' ? 'badge-lime' : 'badge-muted'}`}
                >
                  <ShieldCheck className="h-3 w-3" aria-hidden />
                  {ticketStatusLabel[ticket.status] ?? ticket.status}
                </span>
                <span className="badge badge-muted">
                  {tripStatusLabel[ticket.trip.status] ?? ticket.trip.status}
                </span>
              </div>

              <p className="caption mt-3">{formatLongDate(departure)}</p>

              <div className="journey-row mt-3">
                <div className="journey-from">
                  <p className={`${placeCodeClass(ticket.trip.route.origin.name)} truncate`}>
                    {placeShortName(ticket.trip.route.origin.name)}
                  </p>
                  <p className="caption mt-1 truncate">{ticket.trip.route.origin.name}</p>
                </div>
                <span className="journey-badge" aria-hidden>
                  <BusFront className="h-4 w-4" />
                </span>
                <div className="journey-to">
                  <p className={`${placeCodeClass(ticket.trip.route.destination.name)} truncate`}>
                    {placeShortName(ticket.trip.route.destination.name)}
                  </p>
                  <p className="caption mt-1 truncate">{ticket.trip.route.destination.name}</p>
                </div>
              </div>

              <div className="mt-5 flex items-end justify-between gap-3">
                <div>
                  <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.14em] text-ink-500">
                    Kalkış
                  </p>
                  <p className="num font-display text-[1.75rem] font-bold leading-none text-ink-900">
                    {formatTime(departure)}
                  </p>
                </div>
                <span className="duration-pill mb-1">{formatDuration(duration)}</span>
                <div className="text-right">
                  <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.14em] text-ink-500">
                    Varış
                  </p>
                  <p className="num font-display text-[1.75rem] font-bold leading-none text-ink-900">
                    {formatTime(arrival)}
                  </p>
                </div>
              </div>
            </div>

            <dl className="facts-strip">
              <div className="fact">
                <dt className="fact-label">Yolcu</dt>
                <dd className="fact-value">
                  {ticket.order.passengerFirstName} {ticket.order.passengerLastName}
                </dd>
              </div>
              <div className="fact">
                <dt className="fact-label">Koltuk</dt>
                <dd className="fact-value">{ticket.tripSeat.seatNo}</dd>
              </div>
              <div className="fact">
                <dt className="fact-label">Araç</dt>
                <dd className="fact-value">{ticket.trip.bus.plateNumber}</dd>
              </div>
            </dl>

            <div className="px-5 py-4">
              {liveEligible ? (
                <Link
                  href={`/trips/${ticket.trip.id}/live?ticketId=${ticket.id}`}
                  className="btn btn-primary w-full"
                >
                  <Radio className="h-4 w-4" aria-hidden />
                  Otobüsü canlı izle
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </Link>
              ) : (
                <p className="alert-info flex items-center gap-2">
                  <Clock3 className="h-4 w-4 shrink-0 text-ink-400" aria-hidden />
                  Canlı takip, sefer biniş aşamasına geçtiğinde bu ekranda açılır.
                </p>
              )}
            </div>
          </div>

          {/* QR stub */}
          <div className="relative border-t-2 border-dashed border-ink-900/12 bg-cream-200 px-5 py-6 text-center lg:border-l-2 lg:border-t-0">
            <span
              className="absolute -left-3 -top-3 h-6 w-6 rounded-full bg-sage-100 lg:left-auto lg:right-auto"
              aria-hidden
            />
            <span
              className="absolute -right-3 -top-3 h-6 w-6 rounded-full bg-sage-100 lg:hidden"
              aria-hidden
            />

            <p className="eyebrow justify-center">Biniş kodu</p>
            <div className="mx-auto mt-4 w-full max-w-[13rem] rounded-[1.25rem] bg-white p-3 shadow-card">
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

            <p className="num mt-3 text-[0.8125rem] font-bold text-ink-900">{ticket.ticketNo}</p>
            <p className="caption mt-2 leading-5">Biniş sırasında bu kodu görevliye okutun.</p>
            {qrExpiresAt ? (
              <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-[0.6875rem] font-semibold text-ink-700 shadow-card">
                <Clock3 className="h-3 w-3" aria-hidden />
                {formatTime(qrExpiresAt)}&apos;e kadar geçerli
              </p>
            ) : null}
            {typeof ticket.order.totalMinor === 'number' ? (
              <p className="caption mt-3">
                Ödenen tutar: {formatMinorPrice(ticket.order.totalMinor)}
              </p>
            ) : null}
          </div>
        </article>

        <p className="caption mt-4 text-center leading-5">
          Bilet, Siirt Kurtalan Ekspres yolcu hesabınıza tanımlıdır ve yalnızca kayıtlı yolcu
          tarafından kullanılabilir.
        </p>
      </div>
    </div>
  );
}
