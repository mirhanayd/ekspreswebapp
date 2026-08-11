import { ArrowRight, CalendarDays, Clock3, MapPin, Radio, Ticket } from 'lucide-react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { authenticatedApiFetch } from '@/lib/server-api';
import { formatDayMonth, formatTime, ticketStatusLabel, tripStatusLabel } from '@/lib/format';

export const metadata = { title: 'Biletlerim' };

type PassengerTicket = {
  id: string;
  ticketNo: string;
  status: string;
  trip: {
    id: string;
    status: string;
    departureTime: string;
    arrivalTime: string;
    bus?: { plateNumber?: string };
    route: { origin: { name: string }; destination: { name: string } };
  };
  tripSeat: { seatNo: string };
};

export default async function MyTicketsPage() {
  let active: PassengerTicket[] = [];
  let past: PassengerTicket[] = [];
  let cancelled: PassengerTicket[] = [];

  const response = await authenticatedApiFetch('/tickets');
  if (!response || response.status === 401) redirect('/login?returnTo=/tickets');
  try {
    if (response.ok) {
      const data = await response.json();
      active = data.active || [];
      past = data.past || [];
      cancelled = data.cancelled || [];
    }
  } catch {
    // Render the safe empty state if the ticket response cannot be decoded.
  }

  const groups = [
    {
      key: 'active',
      title: 'Aktif biletler',
      copy: 'Yaklaşan ve devam eden yolculuklarınız',
      tickets: active,
      tone: 'active' as const,
    },
    {
      key: 'past',
      title: 'Geçmiş seferler',
      copy: 'Tamamlanan yolculuklar',
      tickets: past,
      tone: 'muted' as const,
    },
    {
      key: 'cancelled',
      title: 'İptal edilenler',
      copy: 'Geçerliliği sona eren biletler',
      tickets: cancelled,
      tone: 'muted' as const,
    },
  ];

  const isEmpty = !active.length && !past.length && !cancelled.length;

  return (
    <div className="page shell">
      <header className="panel panel-sheen p-5 sm:p-7">
        <div className="relative flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="eyebrow-invert">Yolculuk cüzdanı</p>
            <h1 className="title-lg mt-1.5 flex items-center gap-2.5 text-white">
              <Ticket className="h-6 w-6 shrink-0 text-brand-400" aria-hidden />
              Biletlerim
            </h1>
            <p className="mt-2 max-w-lg text-sm leading-6 text-ink-300">
              Biniş QR kodunuz, koltuk bilginiz ve canlı takip bağlantınız tek ekranda.
            </p>
          </div>
          <div className="flex gap-2.5">
            <CountTile label="Aktif" value={active.length} highlight />
            <CountTile label="Geçmiş" value={past.length} />
          </div>
        </div>
      </header>

      {isEmpty ? (
        <div className="empty-state mt-4">
          <span className="grid h-14 w-14 place-items-center rounded-2xl bg-ink-100 text-ink-400">
            <Ticket className="h-7 w-7" aria-hidden />
          </span>
          <h2 className="title-md mt-4">Henüz biletiniz yok</h2>
          <p className="subtle mt-2 max-w-sm">
            İlk yolculuğunuz için sefer arayın; bilet ve QR kodunuz otomatik olarak burada
            listelenir.
          </p>
          <Link href="/#sefer-ara" className="btn btn-primary mt-6">
            Sefer ara
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </div>
      ) : (
        <div className="mt-6 space-y-8">
          {groups
            .filter((group) => group.tickets.length)
            .map((group) => (
              <section key={group.key} aria-labelledby={`grup-${group.key}`}>
                <div className="mb-3 flex items-end justify-between gap-3">
                  <div>
                    <h2 id={`grup-${group.key}`} className="title-md">
                      {group.title}
                    </h2>
                    <p className="text-sm text-ink-500">{group.copy}</p>
                  </div>
                  <span className="badge badge-muted shrink-0">{group.tickets.length} bilet</span>
                </div>

                <ul className="grid gap-3 md:grid-cols-2">
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
  );
}

function TicketCard({ ticket, tone }: { ticket: PassengerTicket; tone: 'active' | 'muted' }) {
  const live =
    ticket.status === 'active' && ['boarding', 'in_transit'].includes(ticket.trip.status);
  const isActive = tone === 'active';

  return (
    <article className="card overflow-hidden">
      <Link
        href={`/tickets/${ticket.id}`}
        className="flex transition hover:bg-ink-50/70 focus-visible:bg-ink-50"
      >
        <span
          aria-hidden
          className={`flex w-10 shrink-0 flex-col items-center justify-between py-4 text-white ${
            isActive ? 'bg-brand-700' : 'bg-ink-400'
          }`}
        >
          <span className="rail-label">Ekspres</span>
          <span className="grid h-7 w-7 place-items-center rounded-full bg-ink-950 text-2xs font-extrabold">
            {ticket.tripSeat.seatNo}
          </span>
        </span>
        <span className="min-w-0 flex-1 p-4">
          <span className="flex items-start justify-between gap-3">
            <span className="min-w-0">
              <span className="num block text-2xs font-bold uppercase tracking-wider text-brand-700">
                {ticket.ticketNo}
              </span>
              <span className="mt-1.5 flex min-w-0 items-center gap-2 font-display text-base font-bold text-ink-900">
                <span className="truncate">{ticket.trip.route.origin.name}</span>
                <ArrowRight className="h-4 w-4 shrink-0 text-brand-600" aria-hidden />
                <span className="truncate">{ticket.trip.route.destination.name}</span>
              </span>
            </span>
            <span className={`badge shrink-0 ${isActive ? 'badge-brand' : 'badge-muted'}`}>
              {ticketStatusLabel[ticket.status] ?? ticket.status}
            </span>
          </span>

          <span className="mt-4 grid grid-cols-3 gap-2 border-t border-ink-100 pt-3">
            <MiniField
              icon={<CalendarDays aria-hidden />}
              label="Tarih"
              value={formatDayMonth(ticket.trip.departureTime)}
            />
            <MiniField
              icon={<Clock3 aria-hidden />}
              label="Kalkış"
              value={formatTime(ticket.trip.departureTime)}
            />
            <MiniField
              icon={<MapPin aria-hidden />}
              label="Varış"
              value={formatTime(ticket.trip.arrivalTime)}
            />
          </span>

          <span className="mt-3 flex items-center justify-between gap-2 text-xs font-semibold">
            <span className="truncate text-ink-500">
              {tripStatusLabel[ticket.trip.status] ?? ticket.trip.status}
              {ticket.trip.bus?.plateNumber ? ` · ${ticket.trip.bus.plateNumber}` : ''}
            </span>
            <span className="flex shrink-0 items-center gap-1 text-brand-700">
              Bileti aç
              <ArrowRight className="h-3.5 w-3.5" aria-hidden />
            </span>
          </span>
        </span>
      </Link>

      {live ? (
        <div className="border-t border-ink-100 bg-ink-50 px-4 py-3">
          <Link
            href={`/trips/${ticket.trip.id}/live?ticketId=${ticket.id}`}
            className="btn btn-sm btn-dark w-full"
          >
            <Radio className="h-3.5 w-3.5" aria-hidden />
            Canlı izle
          </Link>
        </div>
      ) : null}
    </article>
  );
}

function MiniField({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <span className="block min-w-0">
      <span className="flex items-center gap-1 text-2xs font-bold uppercase tracking-wide text-ink-500">
        <span className="[&>svg]:h-3 [&>svg]:w-3">{icon}</span>
        {label}
      </span>
      <span className="num mt-0.5 block truncate text-sm font-bold text-ink-900">{value}</span>
    </span>
  );
}

function CountTile({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: number;
  highlight?: boolean;
}) {
  return (
    <div
      className={`relative rounded-2xl px-3.5 py-2 text-center ${
        highlight ? 'bg-brand-700' : 'bg-white/10'
      }`}
    >
      <p className="num font-display text-2xl font-extrabold leading-none">{value}</p>
      <p className="mt-1 text-2xs font-bold uppercase tracking-wide text-white/70">{label}</p>
    </div>
  );
}
