import Link from 'next/link';
import { ArrowRight, BusFront, MapPin, Route as RouteIcon } from 'lucide-react';
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
import { AdminTransport } from '@/lib/admin-types';
import { adminApiJson } from '@/lib/server-api';

const statusLabel: Record<string, string> = {
  scheduled: 'Planlandı',
  boarding: 'Biniş',
  in_transit: 'Yolda',
  completed: 'Tamamlandı',
  cancelled: 'İptal',
};

const statusTone = (status: string) =>
  status === 'in_transit' || status === 'boarding'
    ? ('live' as const)
    : status === 'cancelled'
      ? ('warn' as const)
      : ('neutral' as const);

export default async function TripsPage() {
  const operations = await adminApiJson<AdminTransport>('/admin/transport');
  const totalSeats = operations.trips.reduce((sum, trip) => sum + trip.totalSeats, 0);
  const soldSeats = operations.trips.reduce((sum, trip) => sum + trip.soldSeats, 0);

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Ulaşım"
        title="Operasyon verisi"
        description={`${operations.locations.length} konum · ${operations.routes.length} rota · ${operations.buses.length} otobüs`}
        actions={
          <Link href="/operations/fleet" className="ops-btn ops-btn-primary">
            Canlı filo
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        }
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <SummaryTile label="Tanımlı sefer" value={operations.trips.length.toString()} />
        <SummaryTile label="Toplam koltuk" value={totalSeats.toString()} />
        <SummaryTile
          label="Satılan koltuk"
          value={`${soldSeats}`}
          hint={totalSeats ? `%${Math.round((soldSeats / totalSeats) * 100)} doluluk` : undefined}
        />
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Rotalar</CardTitle>
            <CardDescription>Tanımlı hatlar ve uç noktaları.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {operations.routes.map((route) => (
              <div
                key={route.id}
                className="flex items-start gap-3 rounded-xl border border-ink-200/80 p-3"
              >
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-700">
                  <RouteIcon className="h-4 w-4" aria-hidden />
                </span>
                <div className="min-w-0">
                  <p className="truncate font-semibold text-ink-900">{route.name}</p>
                  <p className="mt-0.5 flex items-center gap-1.5 truncate text-xs text-ink-500">
                    <MapPin className="h-3 w-3 shrink-0" aria-hidden />
                    {route.originName} → {route.destinationName}
                  </p>
                </div>
              </div>
            ))}
            {!operations.routes.length ? (
              <p className="py-6 text-center text-sm text-ink-500">Tanımlı rota bulunmuyor.</p>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Otobüsler</CardTitle>
            <CardDescription>Filo envanteri ve anlık görev durumu.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {operations.buses.map((bus) => (
              <div
                key={bus.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-ink-200/80 p-3"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-ink-100 text-ink-700">
                    <BusFront className="h-4 w-4" aria-hidden />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-ink-900">{bus.plateNumber}</p>
                    <p className="truncate text-xs text-ink-500">
                      {bus.model || 'Model belirtilmedi'} · {bus.totalSeats} koltuk
                    </p>
                  </div>
                </div>
                <Badge tone={bus.activeTrips ? 'live' : 'neutral'}>
                  {bus.activeTrips ? 'Görevde' : 'Hazır'}
                </Badge>
              </div>
            ))}
            {!operations.buses.length ? (
              <p className="py-6 text-center text-sm text-ink-500">Kayıtlı otobüs bulunmuyor.</p>
            ) : null}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Seferler</CardTitle>
          <CardDescription>Kalkış saatine göre planlanan tüm seferler.</CardDescription>
        </CardHeader>
        <CardContent className="px-0 py-0 sm:px-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Hat / Araç</TableHead>
                <TableHead>Kalkış</TableHead>
                <TableHead>Doluluk</TableHead>
                <TableHead>Ücret</TableHead>
                <TableHead>Durum</TableHead>
                <TableHead className="text-right">İşlem</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {operations.trips.map((trip) => {
                const percent = trip.totalSeats
                  ? Math.round((trip.soldSeats / trip.totalSeats) * 100)
                  : 0;
                return (
                  <TableRow key={trip.id}>
                    <TableCell>
                      <p className="font-semibold text-ink-900">
                        {trip.originName} → {trip.destinationName}
                      </p>
                      <p className="text-xs text-ink-500">{trip.plateNumber}</p>
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {new Date(trip.departureTime).toLocaleString('tr-TR', {
                        day: '2-digit',
                        month: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </TableCell>
                    <TableCell>
                      <div className="min-w-28">
                        <p className="text-xs font-semibold text-ink-700">
                          {trip.soldSeats}/{trip.totalSeats} · %{percent}
                        </p>
                        <span className="ops-meter mt-1.5">
                          <span className="ops-meter-fill" style={{ width: `${percent}%` }} />
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="whitespace-nowrap font-semibold">
                      {trip.basePrice.toLocaleString('tr-TR')} ₺
                    </TableCell>
                    <TableCell>
                      <Badge tone={statusTone(trip.status)}>
                        {statusLabel[trip.status] || trip.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Link
                        href="/operations/fleet"
                        className="font-semibold text-brand-700 hover:underline"
                      >
                        Filoda gör
                      </Link>
                    </TableCell>
                  </TableRow>
                );
              })}
              {!operations.trips.length ? (
                <EmptyRow colSpan={6}>Planlanmış sefer bulunmuyor.</EmptyRow>
              ) : null}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function SummaryTile({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="surface p-4">
      <p className="metric-label">{label}</p>
      <p className="mt-1.5 font-display text-2xl font-extrabold tracking-tight">{value}</p>
      {hint ? <p className="mt-1 text-xs text-ink-500">{hint}</p> : null}
    </div>
  );
}
