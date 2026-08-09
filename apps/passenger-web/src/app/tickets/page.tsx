import { Ticket } from 'lucide-react';
import Link from 'next/link';

export default async function MyTicketsPage() {
  // For demo MVP, we will use a demo user id
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';
  let active = [];
  let past = [];
  let cancelled = [];

  try {
    const res = await fetch(`${apiUrl}/tickets`, {
      headers: {
        Authorization: `Bearer demo-token`,
      },
      cache: 'no-store',
    });
    if (res.ok) {
      const data = await res.json();
      active = data.active || [];
      past = data.past || [];
      cancelled = data.cancelled || [];
    }
  } catch (error) {
    console.error('Failed to fetch tickets:', error);
  }

  const renderTicketCard = (ticket: any) => (
    <Link
      href={`/tickets/${ticket.id}`}
      key={ticket.id}
      className="block bg-white rounded-2xl shadow-sm border border-gray-100 p-4 hover:shadow-md transition-shadow"
    >
      <div className="flex justify-between items-start mb-3">
        <div>
          <p className="text-sm text-gray-500 mb-1">
            {new Date(ticket.trip?.departureTime).toLocaleDateString('tr-TR', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
          </p>
          <div className="flex items-center gap-2">
            <span className="font-semibold text-gray-900">{ticket.trip?.route?.origin?.name}</span>
            <span className="text-gray-400">→</span>
            <span className="font-semibold text-gray-900">
              {ticket.trip?.route?.destination?.name}
            </span>
          </div>
        </div>
        <div className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-xs font-medium">
          Koltuk {ticket.tripSeat?.seatNo}
        </div>
      </div>
      <div className="flex justify-between items-center text-sm border-t border-gray-100 pt-3">
        <span className="text-gray-500">{ticket.ticketNo}</span>
        <span className="flex items-center gap-1 text-blue-600 font-medium">Detayları Gör</span>
      </div>
    </Link>
  );

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-lg mx-auto px-4 space-y-8">
        <div className="flex items-center gap-3">
          <Ticket className="h-6 w-6 text-blue-600" />
          <h1 className="text-2xl font-bold text-gray-900">Biletlerim</h1>
        </div>

        {active.length === 0 && past.length === 0 && cancelled.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center text-gray-500">
            Henüz biletiniz bulunmuyor.
          </div>
        ) : (
          <div className="space-y-6">
            {active.length > 0 && (
              <section className="space-y-3">
                <h2 className="font-semibold text-gray-900 px-1">Aktif Biletler</h2>
                <div className="space-y-3">{active.map(renderTicketCard)}</div>
              </section>
            )}

            {past.length > 0 && (
              <section className="space-y-3 mt-8">
                <h2 className="font-semibold text-gray-900 px-1">Geçmiş Seferler</h2>
                <div className="space-y-3 opacity-75">{past.map(renderTicketCard)}</div>
              </section>
            )}

            {cancelled.length > 0 && (
              <section className="space-y-3 mt-8">
                <h2 className="font-semibold text-gray-900 px-1">İptal Edilenler</h2>
                <div className="space-y-3 opacity-50 grayscale">
                  {cancelled.map(renderTicketCard)}
                </div>
              </section>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
