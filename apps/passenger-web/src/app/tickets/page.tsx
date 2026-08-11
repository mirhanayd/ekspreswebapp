import { ArrowRight, CalendarDays, Ticket } from 'lucide-react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { authenticatedApiFetch } from '@/lib/server-api';

type PassengerTicket = {
  id: string;
  ticketNo: string;
  status: string;
  trip: {
    departureTime: string;
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
      title: 'Aktif biletler',
      copy: 'Yaklaşan ve devam eden yolculuklar',
      tickets: active,
      emphasized: true,
    },
    { title: 'Geçmiş seferler', copy: 'Tamamlanan yolculuklar', tickets: past, emphasized: false },
    {
      title: 'İptal edilenler',
      copy: 'Geçerliliği sona eren biletler',
      tickets: cancelled,
      emphasized: false,
    },
  ];
  return (
    <div className="page-shell">
      <div className="mx-auto max-w-5xl space-y-7">
        <header className="rounded-3xl bg-slate-950 p-6 text-white sm:p-8">
          <p className="eyebrow !text-red-400">Yolculuk cüzdanı</p>
          <div className="mt-2 flex items-center gap-3">
            <Ticket className="h-8 w-8 text-red-500" />
            <h1 className="text-3xl font-black">Biletlerim</h1>
          </div>
          <p className="mt-3 max-w-xl text-sm leading-6 text-slate-300">
            Aktif biletinizi, güvenli QR kodunuzu ve canlı takip bağlantınızı tek yerden yönetin.
          </p>
        </header>
        {!active.length && !past.length && !cancelled.length ? (
          <div className="surface-card p-10 text-center">
            <Ticket className="mx-auto h-12 w-12 text-stone-300" />
            <h2 className="mt-4 text-xl font-black">Henüz biletiniz yok</h2>
            <p className="mt-2 text-sm text-slate-500">İlk yolculuğunuz için sefer arayın.</p>
            <Link href="/#sefer-ara" className="primary-action mt-6">
              Sefer ara
            </Link>
          </div>
        ) : (
          groups
            .filter((group) => group.tickets.length)
            .map((group) => (
              <section key={group.title}>
                <div className="mb-3">
                  <h2 className="text-xl font-black">{group.title}</h2>
                  <p className="text-sm text-slate-500">{group.copy}</p>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  {group.tickets.map((ticket) => (
                    <Link
                      href={`/tickets/${ticket.id}`}
                      key={ticket.id}
                      className={`surface-card group block overflow-hidden border-l-4 p-5 transition hover:-translate-y-0.5 hover:shadow-lg ${group.emphasized ? 'border-l-red-700' : 'border-l-stone-300 opacity-80'}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-mono text-xs font-bold text-red-700">
                            {ticket.ticketNo}
                          </p>
                          <h3 className="mt-2 flex items-center gap-2 font-black">
                            <span>{ticket.trip.route.origin.name}</span>
                            <ArrowRight className="h-4 w-4 text-red-700" />
                            <span>{ticket.trip.route.destination.name}</span>
                          </h3>
                        </div>
                        <span className="rounded-full bg-slate-950 px-3 py-1 text-xs font-black text-white">
                          Koltuk {ticket.tripSeat.seatNo}
                        </span>
                      </div>
                      <div className="mt-5 flex items-center justify-between border-t border-stone-100 pt-4 text-sm">
                        <span className="flex items-center gap-2 text-slate-500">
                          <CalendarDays className="h-4 w-4" />
                          {new Date(ticket.trip.departureTime).toLocaleDateString('tr-TR', {
                            day: 'numeric',
                            month: 'long',
                          })}
                        </span>
                        <span className="flex items-center gap-1 font-bold text-red-700">
                          Detay <ArrowRight className="h-4 w-4" />
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            ))
        )}
      </div>
    </div>
  );
}
