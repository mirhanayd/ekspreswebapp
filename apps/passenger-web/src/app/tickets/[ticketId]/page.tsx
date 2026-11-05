import Link from 'next/link';
import { redirect } from 'next/navigation';
import { X } from 'lucide-react';
import { ServerError, ticketService } from '@ekspres/database';
import { getAccessToken } from '@/lib/server-api';
import { requirePassengerToken } from '@/lib/server-auth';
import { qrSvgPath } from '@/lib/qr';
import { BrandMark } from '@/components/BrandLogo';
import { BackButton } from '@/components/nav/BackButton';
import { ShareTicketButton, TicketActions } from '@/components/ticket/TicketActions';
import {
  formatDuration,
  formatLongDate,
  formatMinorPrice,
  formatTime,
  minutesBetween,
  placeShortName,
} from '@/lib/format';

export const metadata = { title: 'Biletim' };
export const dynamic = 'force-dynamic';

type TicketDetail = {
  id: string;
  ticketNo: string;
  status: string;
  trip: {
    id: string;
    status: string;
    departureTime: Date;
    arrivalTime: Date;
    bus: { plateNumber: string; seatLayout?: { layout?: string } | null };
    route: { origin: { name: string }; destination: { name: string } };
  };
  tripSeat: { seatNo: string };
  order: {
    passengerFirstName: string;
    passengerLastName: string;
    totalMinor?: number;
    alightingLocation?: { name: string } | null;
  };
};

/** Long settlement names step down a size instead of running into the duration marker. */
function codeClass(name: string) {
  return `num uppercase leading-none tracking-[-0.01em] ${
    placeShortName(name).length > 7
      ? 'text-[20px] [font-stretch:110%]'
      : 'text-[27px] [font-stretch:122%]'
  }`;
}

function boardingTime(departure: Date) {
  return formatTime(new Date(departure.getTime() - 20 * 60_000));
}

/**
 * Boarding pass: dark upper half, perforated divider, facts and the signed QR.
 * Below it the alighting-notification row and the live-tracking entry.
 */
export default async function TicketDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ ticketId: string }>;
  searchParams: Promise<{ yeni?: string }>;
}) {
  const { ticketId } = await params;
  const { yeni } = await searchParams;
  const returnTo = `/tickets/${ticketId}`;

  const token = await getAccessToken();
  if (!token) redirect(`/login?returnTo=${returnTo}`);
  let principal: Awaited<ReturnType<typeof requirePassengerToken>>;
  try {
    principal = await requirePassengerToken(token);
  } catch (authError) {
    if (authError instanceof ServerError && [401, 403].includes(authError.status)) {
      redirect(`/login?returnTo=${returnTo}`);
    }
    throw authError;
  }

  let ticket: TicketDetail | null = null;
  let qr: { path: string; size: number } | null = null;
  let error: string | null = null;
  try {
    ticket = (await ticketService.getTicketDetail(
      ticketId,
      principal.id,
    )) as unknown as TicketDetail;
    qr = qrSvgPath((await ticketService.getTicketQr(ticketId, principal.id)).payload);
  } catch (caught) {
    error =
      caught instanceof ServerError && [403, 404].includes(caught.status)
        ? 'Bilet bulunamadı veya erişim yetkin yok.'
        : 'Bilet şu anda yüklenemedi.';
  }

  if (error || !ticket || !qr) {
    return (
      <div className="flex min-h-[100dvh] flex-col gap-4 px-4 pt-3.5">
        <BackButton fallback="/tickets" />
        <div className="surface px-6 py-10 text-center">
          <h1 className="m-0 text-lg font-extrabold">Bilet açılamadı</h1>
          <p className="mx-auto mb-0 mt-2 max-w-[260px] text-sm text-sk-ink2">{error}</p>
          <Link href="/tickets" className="btn btn-brand mt-5">
            Biletlerime dön
          </Link>
        </div>
      </div>
    );
  }

  const { trip, order } = ticket;
  const origin = trip.route.origin.name;
  const destination = trip.route.destination.name;
  const stopName = order.alightingLocation?.name ?? destination;
  const live = ticket.status === 'active' && ['boarding', 'in_transit'].includes(trip.status);
  const fields = [
    { k: 'Yolcu', v: `${order.passengerFirstName} ${order.passengerLastName}`, sub: '' },
    { k: 'Koltuk', v: ticket.tripSeat.seatNo, sub: '' },
    { k: 'İniş', v: placeShortName(stopName), sub: 'bildirimli durak' },
    { k: 'Otobüs', v: trip.bus.plateNumber, sub: trip.bus.seatLayout?.layout ?? '2+1' },
    { k: 'Biniş', v: boardingTime(trip.departureTime), sub: 'kapı açılışı' },
    {
      k: 'Ücret',
      v: order.totalMinor ? formatMinorPrice(order.totalMinor) : '—',
      sub: 'demo ödeme',
    },
  ];

  return (
    <div className="flex min-h-[100dvh] flex-col">
      <header className="flex h-[72px] items-center gap-3 px-4 pt-3.5">
        {yeni ? (
          <Link href="/" data-nav="back" aria-label="Kapat" className="round-btn no-underline">
            <X size={20} strokeWidth={2.4} aria-hidden />
          </Link>
        ) : (
          <BackButton fallback="/tickets" />
        )}
        <h1 className="m-0 flex-1 text-lg font-extrabold">Biletim</h1>
        <ShareTicketButton
          title="Siirt Kurtalan Ekspres bileti"
          text={`${placeShortName(origin)} → ${placeShortName(destination)} · ${formatLongDate(trip.departureTime)} ${formatTime(trip.departureTime)} · Koltuk ${ticket.tripSeat.seatNo} · ${ticket.ticketNo}`}
        />
      </header>

      <div className="flex flex-col gap-[14px] px-4 pb-7 pt-1">
        <article
          className="ticket-in flex-none overflow-hidden rounded-[28px] bg-white"
          style={{ boxShadow: '0 26px 44px -26px rgba(22,23,27,.5)' }}
        >
          <div className="flex flex-col gap-[18px] bg-sk-dark px-5 pb-5 pt-[18px] text-white">
            <div className="flex items-center justify-between gap-2.5">
              <BrandMark tone="light" className="w-[96px]" />
              <span className="text-xs font-bold tracking-[0.08em] text-sk-mute">
                {ticket.ticketNo}
              </span>
            </div>
            <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-end gap-2.5">
              <div className="flex min-w-0 flex-col gap-[5px]">
                <span className="truncate text-xs text-sk-mute">{origin}</span>
                <span className={codeClass(origin)}>{placeShortName(origin)}</span>
                <span className="num-md text-xl [font-stretch:115%]">
                  {formatTime(trip.departureTime)}
                </span>
              </div>
              <div className="flex flex-col items-center gap-1.5 pb-2">
                <span className="whitespace-nowrap text-[11px] text-sk-mute">
                  {formatDuration(minutesBetween(trip.departureTime, trip.arrivalTime))}
                </span>
                <svg width="64" height="18" viewBox="0 0 64 18" aria-hidden>
                  <path
                    d="M2 9H62"
                    stroke="#4A4C53"
                    strokeWidth="2"
                    strokeDasharray="3 4"
                    strokeLinecap="round"
                  />
                  <rect x="22" y="2" width="20" height="14" rx="4" fill="#C8231B" />
                  <path
                    d="M25 7H39M25 11H39"
                    stroke="#FFFFFF"
                    strokeWidth="1.6"
                    strokeOpacity=".8"
                  />
                </svg>
              </div>
              <div className="flex min-w-0 flex-col items-end gap-[5px] text-right">
                <span className="truncate text-xs text-sk-mute">{destination}</span>
                <span className={codeClass(destination)}>{placeShortName(destination)}</span>
                <span className="num-md text-xl [font-stretch:115%]">
                  {formatTime(trip.arrivalTime)}
                </span>
              </div>
            </div>
            <div className="flex items-center justify-between gap-2.5 text-[13px] text-sk-mute">
              <span>{formatLongDate(trip.departureTime)}</span>
              {live ? (
                <span className="inline-flex h-6 items-center gap-1.5 rounded-xl bg-[rgba(227,57,46,.18)] px-[9px] text-xs font-extrabold text-[#FF9A92]">
                  <span aria-hidden className="live-dot h-1.5 w-1.5 text-[#E3392E]" />
                  Yolda
                </span>
              ) : null}
            </div>
          </div>

          <div aria-hidden className="relative h-[22px] bg-white">
            <span className="absolute -left-[11px] top-0 h-[22px] w-[22px] rounded-full bg-sk-bg" />
            <span className="absolute -right-[11px] top-0 h-[22px] w-[22px] rounded-full bg-sk-bg" />
            <span className="absolute inset-x-5 top-2.5 border-t-2 border-dashed border-[#E1E1DC]" />
          </div>

          <div className="flex flex-col gap-[18px] px-5 pb-5 pt-1">
            <dl className="m-0 grid grid-cols-3 gap-x-2.5 gap-y-4">
              {fields.map((field) => (
                <div key={field.k} className="flex min-w-0 flex-col gap-[3px]">
                  <dt className="eyebrow">{field.k}</dt>
                  <dd className="m-0 break-words text-base font-extrabold leading-tight">
                    {field.v}
                  </dd>
                  <dd className="m-0 text-xs text-sk-ink2">{field.sub}</dd>
                </div>
              ))}
            </dl>
            <div className="flex items-center gap-4 rounded-[20px] bg-[#F6F6F3] p-3">
              <svg
                width="104"
                height="104"
                viewBox={`0 0 ${qr.size} ${qr.size}`}
                role="img"
                aria-label="Bilet QR kodu"
                shapeRendering="crispEdges"
                className="flex-none rounded-[10px]"
              >
                <rect width={qr.size} height={qr.size} fill="#FFFFFF" />
                <path d={qr.path} fill="#15161A" />
              </svg>
              <div className="flex flex-col gap-1">
                <span className="text-base font-extrabold">Binişte okut</span>
                <span className="text-[13px] leading-[1.4] text-sk-ink2">
                  Şoför kodu okuttuğunda biniş kaydın düşer, iniş bildirimlerin başlar.
                </span>
              </div>
            </div>
          </div>
        </article>

        <TicketActions
          stopName={stopName}
          seatNo={ticket.tripSeat.seatNo}
          live={live}
          trackHref={`/trips/${trip.id}/live?ticketId=${ticket.id}`}
        />
      </div>
    </div>
  );
}
