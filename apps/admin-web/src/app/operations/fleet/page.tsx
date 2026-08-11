import { FleetTrip } from '@/lib/admin-types';
import { adminApiJson } from '@/lib/server-api';
import FleetMapView from './FleetMapView';

export default async function FleetPage() {
  const trips = await adminApiJson<FleetTrip[]>('/admin/fleet');
  return <FleetMapView initialTrips={trips} />;
}
