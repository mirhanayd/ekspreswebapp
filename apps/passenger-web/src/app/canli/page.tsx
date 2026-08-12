import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArrowRight, BusFront, Clock3, Radio } from 'lucide-react';
import { authenticatedApiFetch } from '@/lib/server-api';
import { formatDayMonth, formatTime, placeShortName, tripStatusLabel } from '@/lib/format';

export const metadata = { title: 'Canlı takip' };

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

/**
 * Entry point for the tracking tab. Lists the passenger's own tickets and opens
 * live tracking for the ones the server already entitles — the entitlement rule
 * itself is unchanged and still enforced by the tracking bootstrap endpoint.
 */
export default async function LiveHubPage() {
  const response = await authenticatedApiFetch('/tickets');
  if (!response || response.status === 401) redirect('/login?returnTo=/canli');

  let active: PassengerTicket[] = [];
  try {
    if (response.ok) active = (await response.json()).active || [];
  } catch {
    // Fall through to the empty state.
  }

  const trackable = active.filter((ticket) =>
    ['boarding', 'in_transit'].includes(ticket.trip.status),
  );
  const upcoming = active.filter(
    (ticket) => !['boarding', 'in_transit'].includes(ticket.trip.status),
  );

  return (
    <div className="canvas-sage min-h-[100dvh]">
      <div className="screen screen-pad">
        <div className="top-row">
          <p className="font-display text-[1.375rem] font-bold text-ink-900">Canlı takip</p>
          <span className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-white text-ink-900 shadow-card">
            <Radio className="h-6 w-6" aria-hidden />
          </span>
        </div>

        <h1 className="sr-only">Canlı takip</h1>

        <p className="caption mt-2">
          Yolculuğa çıkan seferlerini haritada anlık olarak izleyebilirsin.
        </p>

        {trackable.length ? (
          <ul className="mt-7 grid gap-3 lg:grid-cols-2">
            {trackable.map((ticket) => (
              <li key={ticket.id}>
                <Link
                  href={`/trips/${ticket.trip.id}/live?ticketId=${ticket.id}`}
                  className="card-link flex items-center gap-3.5 p-4"
                >
                  <span className="grid h-12 w-12 shrink-0 place-items-center rounded-[1.125rem] bg-amber-400 text-ink-900">
                    <Radio className="h-5 w-5" aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-display text-[0.9375rem] font-bold text-ink-900">
                      {placeShortName(ticket.trip.route.origin.name)} –{' '}
                      {placeShortName(ticket.trip.route.destination.name)}
                    </span>
                    <span className="caption block truncate">
                      {tripStatusLabel[ticket.trip.status] ?? ticket.trip.status} ·{' '}
                      {ticket.trip.bus?.plateNumber ?? '—'} · Koltuk {ticket.tripSeat.seatNo}
                    </span>
                  </span>
                  <ArrowRight className="h-5 w-5 shrink-0 text-ink-300" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <div className="empty-state mt-7">
            <span className="grid h-16 w-16 place-items-center rounded-full bg-sage-200 text-ink-400">
              <Radio className="h-7 w-7" aria-hidden />
            </span>
            <h2 className="title-md mt-4">Şu anda izlenecek sefer yok</h2>
            <p className="subtle mt-2 max-w-xs">
              Canlı takip, biletli seferin biniş aşamasına geçtiğinde açılır.
            </p>
            <Link href="/tickets" className="btn btn-primary mt-6">
              Biletlerime git
            </Link>
          </div>
        )}

        {upcoming.length ? (
          <section className="mt-8" aria-labelledby="yaklasan">
            <h2 id="yaklasan" className="title-md">
              Yaklaşan yolculuklar
            </h2>
            <ul className="mt-3 grid gap-2.5 lg:grid-cols-2">
              {upcoming.map((ticket) => (
                <li key={ticket.id}>
                  <Link
                    href={`/tickets/${ticket.id}`}
                    className="card-link flex items-center gap-3.5 p-4"
                  >
                    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-[1.125rem] bg-cream-200 text-ink-700">
                      <BusFront className="h-[1.125rem] w-[1.125rem]" aria-hidden />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-display text-[0.9375rem] font-bold text-ink-900">
                        {placeShortName(ticket.trip.route.origin.name)} –{' '}
                        {placeShortName(ticket.trip.route.destination.name)}
                      </span>
                      <span className="caption flex items-center gap-1.5 truncate">
                        <Clock3 className="h-3.5 w-3.5 shrink-0" aria-hidden />
                        {formatDayMonth(ticket.trip.departureTime)} ·{' '}
                        {formatTime(ticket.trip.departureTime)}
                      </span>
                    </span>
                    <ArrowRight className="h-5 w-5 shrink-0 text-ink-300" aria-hidden />
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>
    </div>
  );
}
