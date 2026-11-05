import { redirect } from 'next/navigation';
import { ServerError, ticketService } from '@ekspres/database';
import { getAccessToken } from '@/lib/server-api';
import { requirePassengerToken } from '@/lib/server-auth';
import { TicketsList, type ListedTicket } from '@/components/ticket/TicketsList';
import { formatTime, placeShortName } from '@/lib/format';

export const metadata = { title: 'Biletlerim' };
export const dynamic = 'force-dynamic';

type PassengerTicket = {
  id: string;
  status: string;
  trip: {
    status: string;
    departureTime: Date;
    bus?: { plateNumber?: string };
    route: { origin: { name: string }; destination: { name: string } };
  };
  tripSeat: { seatNo: string };
};

function dayLabel(date: Date) {
  const startOfDay = (value: Date) =>
    new Date(value.getFullYear(), value.getMonth(), value.getDate());
  const diff = Math.round((+startOfDay(date) - +startOfDay(new Date())) / 86_400_000);
  if (diff === 0) return 'BUGÜN';
  if (diff === 1) return 'YARIN';
  return date
    .toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })
    .toLocaleUpperCase('tr-TR');
}

function toListed(ticket: PassengerTicket): ListedTicket {
  const departure = new Date(ticket.trip.departureTime);
  const plate = ticket.trip.bus?.plateNumber;
  return {
    id: ticket.id,
    dayLabel: dayLabel(departure),
    departure: formatTime(departure),
    route: `${placeShortName(ticket.trip.route.origin.name)} → ${placeShortName(ticket.trip.route.destination.name)}`,
    meta: [`Koltuk ${ticket.tripSeat.seatNo}`, plate].filter(Boolean).join(' · '),
    live: ticket.status === 'active' && ['boarding', 'in_transit'].includes(ticket.trip.status),
    day: String(departure.getDate()),
    month: departure.toLocaleDateString('tr-TR', { month: 'short' }).toLocaleUpperCase('tr-TR'),
    cancelled: ticket.status === 'cancelled',
  };
}

export default async function MyTicketsPage() {
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

  let active: ListedTicket[] = [];
  let past: ListedTicket[] = [];
  try {
    const data = (await ticketService.getMyTickets(principal.id)) as unknown as {
      active: PassengerTicket[];
      past: PassengerTicket[];
      cancelled: PassengerTicket[];
    };
    active = data.active
      .sort((a, b) => +new Date(a.trip.departureTime) - +new Date(b.trip.departureTime))
      .map(toListed);
    past = [...data.past, ...data.cancelled].map(toListed);
  } catch {
    // Render the safe empty state if ticket data is temporarily unavailable.
  }

  return (
    <div className="screen-tab flex flex-col gap-4 px-4 pt-[18px]">
      <h1 className="h1 mx-1 mt-2">Biletlerim</h1>
      <TicketsList active={active} past={past} />
    </div>
  );
}
