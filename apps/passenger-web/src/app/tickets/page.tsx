import { ArrowRight, BusFront, Radio, Ticket, UserRound } from 'lucide-react';
import { ServerError, ticketService } from '@ekspres/database';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getAccessToken } from '@/lib/server-api';
import { requirePassengerToken } from '@/lib/server-auth';
import {
  formatDayMonth,
  formatTime,
  placeCodeClass,
  placeShortName,
  ticketStatusLabel,
  tripStatusLabel,
} from '@/lib/format';

export const metadata = { title: 'Biletlerim' };

type PassengerTicket = {
  id: string;
  ticketNo: string;
  status: string;
  trip: {
    id: string;
    status: string;
    departureTime: string | Date;
    arrivalTime: string | Date;
    bus?: { plateNumber?: string };
    route: { origin: { name: string }; destination: { name: string } };
  };
  tripSeat: { seatNo: string };
};

/**
 * Ticket wallet. Built on the same rail-and-facts card as the search results in
 * `ui/trip-search-reference.png`, on the sage home canvas because this is a
 * browse surface rather than a booking step.
 */
export default async function MyTicketsPage() {
  let active: PassengerTicket[] = [];
  let past: PassengerTicket[] = [];
  let cancelled: PassengerTicket[] = [];

  const token = await getAccessToken();
  if (!token) redirect('/login?returnTo=/tickets');
  let principal: Awaited<ReturnType<typeof requirePassengerToken>>;
  try {
    principal = await requirePassengerToken(token);
  } catch (error) {
    if (error instanceof ServerError && [401, 403].includes(error.status)) {
      redirect('/login?returnTo=/tickets');
    }
    throw error;
  }
  try {
    const data = await ticketService.getMyTickets(principal.id);
    active = data.active;
    past = data.past;
    cancelled = data.cancelled;
  } catch {
    // Render the safe empty state if ticket data is temporarily unavailable.
  }

  const groups = [
    { key: 'active', title: 'Aktif biletler', tickets: active, tone: 'active' as const },
    { key: 'past', title: 'Geçmiş seferler', tickets: past, tone: 'muted' as const },
    { key: 'cancelled', title: 'İptal edilenler', tickets: cancelled, tone: 'muted' as const },
  ];

  const isEmpty = !active.length && !past.length && !cancelled.length;

  return (
    <div className="canvas-sage min-h-[100dvh]">
      <div className="screen-wide screen-pad">
        <div className="top-row">
          <p className="font-display text-[1.375rem] font-bold text-ink-900">Biletlerim</p>
          {/* The desktop rail already carries the account control. */}
          <Link href="/hesap" aria-label="Hesabım" className="icon-btn icon-btn-white lg:hidden">
            <UserRound className="h-5 w-5" aria-hidden />
          </Link>
        </div>

        <h1 className="sr-only">Biletlerim</h1>

        <p className="caption mt-2">
          Biniş QR kodunuz, koltuk bilginiz ve canlı takip bağlantınız tek ekranda.
        </p>

        {isEmpty ? (
          <div className="empty-state mt-7">
            <span className="grid h-16 w-16 place-items-center rounded-full bg-sage-200 text-ink-400">
              <Ticket className="h-7 w-7" aria-hidden />
            </span>
            <h2 className="title-md mt-4">Henüz biletiniz yok</h2>
            <p className="subtle mt-2 max-w-xs">
              İlk yolculuğunuz için sefer arayın; bilet ve QR kodunuz otomatik olarak burada
              listelenir.
            </p>
            <Link href="/search" className="btn btn-primary mt-6">
              Sefer ara
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </div>
        ) : (
          <div className="mt-7 space-y-8">
            {groups
              .filter((group) => group.tickets.length)
              .map((group) => (
                <section key={group.key} aria-labelledby={`grup-${group.key}`}>
                  <div className="flex items-baseline justify-between gap-3">
                    <h2 id={`grup-${group.key}`} className="title-md">
                      {group.title}
                    </h2>
                    <span className="caption shrink-0">{group.tickets.length} bilet</span>
                  </div>

                  <ul className="mt-3 grid gap-4 lg:grid-cols-2">
                    {group.tickets.map((ticket) => (
                      <li key={ticket.id} className="min-w-0">
                        <TicketCard ticket={ticket} tone={group.tone} />
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}

function TicketCard({ ticket, tone }: { ticket: PassengerTicket; tone: 'active' | 'muted' }) {
  const live =
    ticket.status === 'active' && ['boarding', 'in_transit'].includes(ticket.trip.status);
  const isActive = tone === 'active';

  return (
    <article className="overflow-hidden rounded-card bg-white shadow-card">
      <Link href={`/tickets/${ticket.id}`} className="flex transition hover:bg-cream-50">
        <span className={`rail ${isActive ? '' : 'bg-cream-400'}`} aria-hidden>
          <span className="rail-label">Ekspres</span>
          <span className="num grid h-9 w-9 place-items-center rounded-full bg-ink-900 text-[0.8125rem] font-bold text-white">
            {ticket.tripSeat.seatNo}
          </span>
        </span>

        <span className="min-w-0 flex-1 px-4 py-4">
          <span className="flex items-start justify-between gap-3">
            <span className="num block text-[0.6875rem] font-semibold uppercase tracking-[0.14em] text-ink-500">
              {ticket.ticketNo}
            </span>
            <span className={`badge shrink-0 ${isActive ? 'badge-lime' : 'badge-muted'}`}>
              {ticketStatusLabel[ticket.status] ?? ticket.status}
            </span>
          </span>

          <span className="journey-row mt-2.5 items-center">
            <span className="journey-from">
              <span className={`${placeCodeClass(ticket.trip.route.origin.name)} block truncate`}>
                {placeShortName(ticket.trip.route.origin.name)}
              </span>
            </span>
            <span className="journey-badge mt-0" aria-hidden>
              <BusFront className="h-4 w-4" />
            </span>
            <span className="journey-to">
              <span
                className={`${placeCodeClass(ticket.trip.route.destination.name)} block truncate`}
              >
                {placeShortName(ticket.trip.route.destination.name)}
              </span>
            </span>
          </span>

          <span className="caption mt-3 block truncate">
            {formatDayMonth(ticket.trip.departureTime)} · {formatTime(ticket.trip.departureTime)} –{' '}
            {formatTime(ticket.trip.arrivalTime)} ·{' '}
            {tripStatusLabel[ticket.trip.status] ?? ticket.trip.status}
          </span>
        </span>
      </Link>

      <dl className="facts-strip">
        <div className="fact">
          <dt className="fact-label">Koltuk</dt>
          <dd className="fact-value">{ticket.tripSeat.seatNo}</dd>
        </div>
        <div className="fact">
          <dt className="fact-label">Kalkış</dt>
          <dd className="fact-value">{formatTime(ticket.trip.departureTime)}</dd>
        </div>
        <div className="fact">
          <dt className="fact-label">Araç</dt>
          <dd className="fact-value">{ticket.trip.bus?.plateNumber ?? '—'}</dd>
        </div>
      </dl>

      <div className="flex items-center justify-between gap-3 px-4 py-3.5">
        {live ? (
          <Link
            href={`/trips/${ticket.trip.id}/live?ticketId=${ticket.id}`}
            className="btn btn-lime btn-sm px-5"
          >
            <Radio className="h-4 w-4" aria-hidden />
            Canlı izle
          </Link>
        ) : (
          <span className="caption">Biniş kodu hazır</span>
        )}
        <Link href={`/tickets/${ticket.id}`} className="btn btn-primary btn-sm shrink-0 px-5">
          Bileti aç
          <ArrowRight className="h-4 w-4" aria-hidden />
        </Link>
      </div>
    </article>
  );
}
