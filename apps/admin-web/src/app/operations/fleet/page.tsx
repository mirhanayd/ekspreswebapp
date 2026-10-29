import type { DriverRecord } from '@/app/operations/trips/DriverManagement';
import { AdminTransport, FleetTrip } from '@/lib/admin-types';
import { adminApiJson, adminApiJsonOptional } from '@/lib/server-api';
import FleetMapView, { type FleetTripContext } from './FleetMapView';

export default async function FleetPage({
  searchParams,
}: {
  searchParams: Promise<{ trip?: string }>;
}) {
  const trips = await adminApiJson<FleetTrip[]>('/admin/fleet');
  const [transport, drivers, params] = await Promise.all([
    adminApiJsonOptional<AdminTransport | null>('/admin/transport', null),
    adminApiJsonOptional<DriverRecord[]>('/admin/drivers', []),
    searchParams,
  ]);

  const driverById = new Map(drivers.map((driver) => [driver.id, driver]));
  const context: Record<string, FleetTripContext> = {};
  transport?.trips.forEach((trip) => {
    const driver = trip.driverId ? driverById.get(trip.driverId) : undefined;
    context[trip.id] = {
      driverName: driver ? `${driver.firstName} ${driver.lastName}` : null,
      soldSeats: trip.soldSeats,
      totalSeats: trip.totalSeats,
    };
  });

  return (
    <FleetMapView initialTrips={trips} context={context} initialTripId={params.trip ?? null} />
  );
}
