import Link from 'next/link';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { Badge, Card, CardContent, CardHeader, CardTitle } from '@/components/ui';
import { AdminTicket } from '@/lib/admin-types';
import { adminApiJson } from '@/lib/server-api';

const ticketStatusLabel: Record<string, string> = {
  active: 'Aktif',
  used: 'Kullanıldı',
  cancelled: 'İptal',
  expired: 'Süresi doldu',
};

const tripStatusLabel: Record<string, string> = {
  scheduled: 'Planlandı',
  boarding: 'Biniş',
  in_transit: 'Yolda',
  completed: 'Tamamlandı',
  cancelled: 'İptal',
};

export default async function TicketDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ticket = await adminApiJson<AdminTicket>(`/admin/tickets/${id}`);

  const passengerFields: Array<[string, string]> = [
    ['Yolcu', ticket.passenger],
    ['E-posta', ticket.passengerEmail],
    ['Koltuk', ticket.seatNo],
    ['Sipariş no', ticket.orderNo],
  ];
  const tripFields: Array<[string, string]> = [
    ['Güzergâh', `${ticket.originName} → ${ticket.destinationName}`],
    ['Hat', ticket.routeName],
    ['Kalkış', new Date(ticket.departureTime).toLocaleString('tr-TR')],
    ['Sefer durumu', tripStatusLabel[ticket.tripStatus] ?? ticket.tripStatus],
  ];

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <Link
        href="/tickets"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink-600 hover:text-brand-700"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Bilet listesine dön
      </Link>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="page-eyebrow">Bilet detayı</p>
              <CardTitle className="mt-1 text-2xl tabular-nums">{ticket.ticketNo}</CardTitle>
              <p className="mt-1 text-xs text-ink-500">
                Düzenlenme: {new Date(ticket.issuedAt).toLocaleString('tr-TR')}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <Badge tone={ticket.status === 'active' ? 'live' : 'neutral'}>
                {ticketStatusLabel[ticket.status] ?? ticket.status}
              </Badge>
              <span className="font-display text-xl font-extrabold text-brand-700">
                {(ticket.amountMinor / 100).toLocaleString('tr-TR')} ₺
              </span>
            </div>
          </div>
        </CardHeader>

        <CardContent className="grid gap-4 sm:grid-cols-2">
          <FieldGroup title="Yolcu" fields={passengerFields} />
          <FieldGroup title="Sefer" fields={tripFields} />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-ink-600">
            Bu bilet sefer operasyonuna bağlıdır; araç konumu canlı filo ekranından izlenebilir.
          </p>
          <Link href="/operations/fleet" className="ops-btn ops-btn-primary">
            Canlı filo
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}

function FieldGroup({ title, fields }: { title: string; fields: Array<[string, string]> }) {
  return (
    <div>
      <p className="metric-label">{title}</p>
      <dl className="mt-2 divide-y divide-ink-100 rounded-xl border border-ink-200/80">
        {fields.map(([label, value]) => (
          <div key={label} className="flex items-center justify-between gap-3 px-3 py-2.5">
            <dt className="text-xs font-semibold text-ink-500">{label}</dt>
            <dd className="min-w-0 truncate text-sm font-semibold text-ink-900">{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
