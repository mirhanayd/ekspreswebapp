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
import { AdminTransport } from '@/lib/admin-types';
import { adminApiJson } from '@/lib/server-api';

const statusLabel: Record<string, string> = {
  scheduled: 'Planlandı',
  boarding: 'Biniş',
  in_transit: 'Yolda',
  completed: 'Tamamlandı',
  cancelled: 'İptal',
};

export default async function TripsPage() {
  const operations = await adminApiJson<AdminTransport>('/admin/transport');

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-bold uppercase tracking-[0.16em] text-red-700">Ulaşım</p>
        <h1 className="mt-1 text-3xl font-black tracking-tight">Operasyon verisi</h1>
        <p className="mt-1 text-sm text-slate-600">
          {operations.locations.length} konum, {operations.routes.length} rota ve{' '}
          {operations.buses.length} otobüs.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Rotalar</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {operations.routes.map((route) => (
              <div key={route.id} className="rounded-lg border p-3">
                <p className="font-semibold">{route.name}</p>
                <p className="mt-1 text-sm text-slate-500">
                  {route.originName} → {route.destinationName}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Otobüsler</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {operations.buses.map((bus) => (
              <div key={bus.id} className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <p className="font-semibold">{bus.plateNumber}</p>
                  <p className="text-sm text-slate-500">
                    {bus.model || 'Model belirtilmedi'} • {bus.totalSeats} koltuk
                  </p>
                </div>
                <Badge variant={bus.activeTrips ? 'default' : 'secondary'}>
                  {bus.activeTrips ? 'Aktif' : 'Hazır'}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Seferler</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Hat / Araç</TableHead>
                <TableHead>Kalkış</TableHead>
                <TableHead>Doluluk</TableHead>
                <TableHead>Durum</TableHead>
                <TableHead className="text-right">İşlem</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {operations.trips.map((trip) => (
                <TableRow key={trip.id}>
                  <TableCell>
                    <p className="font-semibold">
                      {trip.originName} → {trip.destinationName}
                    </p>
                    <p className="text-xs text-slate-500">{trip.plateNumber}</p>
                  </TableCell>
                  <TableCell>{new Date(trip.departureTime).toLocaleString('tr-TR')}</TableCell>
                  <TableCell>
                    {trip.soldSeats}/{trip.totalSeats}
                  </TableCell>
                  <TableCell>
                    <Badge variant={trip.status === 'in_transit' ? 'default' : 'secondary'}>
                      {statusLabel[trip.status] || trip.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Link
                      href="/operations/fleet"
                      className="font-semibold text-red-700 hover:underline"
                    >
                      Filoda gör
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
