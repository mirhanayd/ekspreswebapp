import Link from 'next/link';
import { Badge, Card, CardContent, CardHeader, CardTitle } from '@/components/ui';
import { AdminTicket } from '@/lib/admin-types';
import { adminApiJson } from '@/lib/server-api';

export default async function TicketDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ticket = await adminApiJson<AdminTicket>(`/admin/tickets/${id}`);
  const fields = [
    ['Yolcu', ticket.passenger],
    ['E-posta', ticket.passengerEmail],
    ['Sipariş', ticket.orderNo],
    ['Güzergâh', `${ticket.originName} → ${ticket.destinationName}`],
    ['Kalkış', new Date(ticket.departureTime).toLocaleString('tr-TR')],
    ['Koltuk', ticket.seatNo],
    ['Tutar', `${(ticket.amountMinor / 100).toLocaleString('tr-TR')} ₺`],
  ];

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <Link href="/tickets" className="text-sm font-semibold text-red-700 hover:underline">
        ← Bilet listesine dön
      </Link>
      <Card>
        <CardHeader className="border-b">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-slate-500">
                Bilet detayı
              </p>
              <CardTitle className="mt-2 font-mono text-2xl">{ticket.ticketNo}</CardTitle>
            </div>
            <Badge variant={ticket.status === 'active' ? 'default' : 'secondary'}>
              {ticket.status === 'active' ? 'Aktif' : ticket.status}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="grid gap-4 pt-6 sm:grid-cols-2">
          {fields.map(([label, value]) => (
            <div key={label} className="rounded-lg bg-slate-50 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                {label}
              </p>
              <p className="mt-1 font-semibold">{value}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
