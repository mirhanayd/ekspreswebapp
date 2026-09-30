import { DriverManagementPanel } from '@/components/DriverManagementPanel';
import { AdminDriver, AdminTransport } from '@/lib/admin-types';
import { adminApiJson } from '@/lib/server-api';

export default async function DriversPage() {
  const [drivers, operations] = await Promise.all([
    adminApiJson<AdminDriver[]>('/admin/driver-operations/drivers'),
    adminApiJson<AdminTransport>('/admin/transport'),
  ]);
  return <DriverManagementPanel initialDrivers={drivers} trips={operations.trips} />;
}
