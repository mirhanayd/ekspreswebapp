import Link from 'next/link';
import { Activity, BusFront, MapPin, Route as RouteIcon } from 'lucide-react';
import {
  Badge,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  PageHeader,
} from '@/components/ui';
import { AdminTransport } from '@/lib/admin-types';
import { adminApiJson } from '@/lib/server-api';
import { DriverManagement, type DriverRecord } from './DriverManagement';
import { TripsBoard } from './TripsBoard';

export default async function TripsPage({
  searchParams,
}: {
  searchParams: Promise<{ trip?: string }>;
}) {
  const [operations, drivers, params] = await Promise.all([
    adminApiJson<AdminTransport>('/admin/transport'),
    adminApiJson<DriverRecord[]>('/admin/drivers'),
    searchParams,
  ]);

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Operasyon"
        title="Seferler"
        description={`${operations.trips.length} sefer · ${operations.routes.length} rota · ${operations.buses.length} otobüs`}
        actions={
          <Link href="/operations/fleet" className="ops-btn ops-btn-secondary">
            <Activity className="h-4 w-4" aria-hidden />
            Canlı filo
          </Link>
        }
      />

      <TripsBoard trips={operations.trips} drivers={drivers} initialTripId={params.trip ?? null} />

      <DriverManagement drivers={drivers} />

      <div className="grid gap-3 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Rotalar</CardTitle>
            <CardDescription>Tanımlı hatlar ve uç noktaları</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {operations.routes.map((route) => (
              <div
                key={route.id}
                className="flex items-center gap-3 rounded-card border border-adm-line p-3"
              >
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-btn bg-adm-bg text-adm-muted">
                  <RouteIcon className="h-4 w-4" aria-hidden />
                </span>
                <div className="min-w-0">
                  <p className="truncate font-medium">{route.name}</p>
                  <p className="mt-0.5 flex min-w-0 items-center gap-1.5 text-sm text-adm-muted">
                    <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden />
                    <span className="truncate">
                      {route.originName} → {route.destinationName}
                    </span>
                  </p>
                </div>
              </div>
            ))}
            {!operations.routes.length ? (
              <p className="py-6 text-center text-sm text-adm-muted">Tanımlı rota bulunmuyor.</p>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Otobüsler</CardTitle>
            <CardDescription>Filo envanteri ve anlık görev durumu</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {operations.buses.map((bus) => (
              <div
                key={bus.id}
                className="flex items-center justify-between gap-3 rounded-card border border-adm-line p-3"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-btn bg-adm-bg text-adm-muted">
                    <BusFront className="h-4 w-4" aria-hidden />
                  </span>
                  <div className="min-w-0">
                    <span className="plate">{bus.plateNumber}</span>
                    <p className="mt-1 truncate text-sm text-adm-muted">
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
              <p className="py-6 text-center text-sm text-adm-muted">Kayıtlı otobüs bulunmuyor.</p>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
