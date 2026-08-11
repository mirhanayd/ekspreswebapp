import Link from 'next/link';
import {
  Badge,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui';
import { AdminTicket } from '@/lib/admin-types';
import { adminApiJson } from '@/lib/server-api';

export default async function TicketsPage() {
  const tickets = await adminApiJson<AdminTicket[]>('/admin/tickets');
  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-bold uppercase tracking-[0.16em] text-red-700">Biletler</p>
        <h1 className="mt-1 text-3xl font-black tracking-tight">Operasyonel bilet listesi</h1>
        <p className="mt-1 text-sm text-slate-600">
          Son 100 bilet • {tickets.length} kayıt gösteriliyor.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Kesilen biletler</CardTitle>
        </CardHeader>
        <CardContent>
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
                    <p className="font-mono font-semibold">{ticket.ticketNo}</p>
                    <p className="text-xs text-slate-500">
                      {new Date(ticket.issuedAt).toLocaleString('tr-TR')}
                    </p>
                  </TableCell>
                  <TableCell>
                    <p className="font-semibold">{ticket.passenger}</p>
                    <p className="text-xs text-slate-500">{ticket.passengerEmail}</p>
                  </TableCell>
                  <TableCell>
                    <p>
                      {ticket.originName} → {ticket.destinationName}
                    </p>
                    <p className="text-xs text-slate-500">Koltuk {ticket.seatNo}</p>
                  </TableCell>
                  <TableCell>{(ticket.amountMinor / 100).toLocaleString('tr-TR')} ₺</TableCell>
                  <TableCell>
                    <Badge variant={ticket.status === 'active' ? 'default' : 'secondary'}>
                      {ticket.status === 'active' ? 'Aktif' : ticket.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Link
                      href={`/tickets/${ticket.id}`}
                      className="font-semibold text-red-700 hover:underline"
                    >
                      Aç
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
              {!tickets.length && (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center text-slate-500">
                    Henüz bilet bulunmuyor.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
