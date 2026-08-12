import Link from 'next/link';
import { ArrowRight, Ticket as TicketIcon } from 'lucide-react';
import {
  Badge,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  EmptyRow,
  PageHeader,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui';
import { AdminTicket } from '@/lib/admin-types';
import { adminApiJson } from '@/lib/server-api';

const ticketStatusLabel: Record<string, string> = {
  active: 'Aktif',
  used: 'Kullanıldı',
  cancelled: 'İptal',
  expired: 'Süresi doldu',
};

export default async function TicketsPage() {
  const tickets = await adminApiJson<AdminTicket[]>('/admin/tickets');
  const activeCount = tickets.filter((ticket) => ticket.status === 'active').length;
  const revenue = tickets.reduce((sum, ticket) => sum + ticket.amountMinor, 0);

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Biletler"
        title="Operasyonel bilet listesi"
        description={`Son 100 bilet · ${tickets.length} kayıt gösteriliyor.`}
        actions={
          <span className="chip-status chip-brand">
            <TicketIcon className="h-3.5 w-3.5" aria-hidden />
            {activeCount} aktif
          </span>
        }
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="surface p-4">
          <p className="metric-label">Listelenen bilet</p>
          <p className="metric-value mt-1.5">{tickets.length}</p>
        </div>
        <div className="surface p-4">
          <p className="metric-label">Aktif bilet</p>
          <p className="metric-value mt-1.5">{activeCount}</p>
        </div>
        <div className="surface p-4">
          <p className="metric-label">Listelenen tutar</p>
          <p className="metric-value mt-1.5">{(revenue / 100).toLocaleString('tr-TR')} ₺</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Kesilen biletler</CardTitle>
          <CardDescription>Bilet, yolcu, sefer ve tahsilat kayıtları.</CardDescription>
        </CardHeader>
        <CardContent className="px-0 py-0 sm:px-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Bilet</TableHead>
                <TableHead>Yolcu</TableHead>
                <TableHead>Sefer / Koltuk</TableHead>
                <TableHead>Tutar</TableHead>
                <TableHead>Durum</TableHead>
                <TableHead className="text-right">Detay</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tickets.map((ticket) => (
                <TableRow key={ticket.id}>
                  <TableCell>
                    <p className="font-semibold tabular-nums text-ink-900">{ticket.ticketNo}</p>
                    <p className="text-xs text-ink-500">
                      {new Date(ticket.issuedAt).toLocaleString('tr-TR', {
                        day: '2-digit',
                        month: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </TableCell>
                  <TableCell>
                    <p className="font-semibold text-ink-900">{ticket.passenger}</p>
                    <p className="text-xs text-ink-500">{ticket.passengerEmail}</p>
                  </TableCell>
                  <TableCell>
                    <p className="text-ink-800">
                      {ticket.originName} → {ticket.destinationName}
                    </p>
                    <p className="text-xs text-ink-500">Koltuk {ticket.seatNo}</p>
                  </TableCell>
                  <TableCell className="whitespace-nowrap font-semibold">
                    {(ticket.amountMinor / 100).toLocaleString('tr-TR')} ₺
                  </TableCell>
                  <TableCell>
                    <Badge tone={ticket.status === 'active' ? 'live' : 'neutral'}>
                      {ticketStatusLabel[ticket.status] ?? ticket.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Link
                      href={`/tickets/${ticket.id}`}
                      className="inline-flex items-center gap-1 font-semibold text-brand-700 hover:underline"
                    >
                      Aç
                      <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
              {!tickets.length ? <EmptyRow colSpan={6}>Henüz bilet bulunmuyor.</EmptyRow> : null}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
