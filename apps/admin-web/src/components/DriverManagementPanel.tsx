'use client';

import { useState } from 'react';
import { AdminDriver, AdminTrip } from '@/lib/admin-types';
import {
  Badge,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  PageHeader,
} from '@/components/ui';

type Props = { initialDrivers: AdminDriver[]; trips: AdminTrip[] };

export function DriverManagementPanel({ initialDrivers, trips: initialTrips }: Props) {
  const [drivers, setDrivers] = useState(initialDrivers);
  const [trips, setTrips] = useState(initialTrips);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState('');

  async function request(path: string, method: string, body?: unknown) {
    const response = await fetch(`/api/admin/${path}`, {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      throw new Error(payload.message || 'İşlem başarısız oldu.');
    }
    return response.json();
  }

  async function toggle(driver: AdminDriver) {
    setBusy(driver.id);
    setError('');
    try {
      const updated = await request(`driver-operations/drivers/${driver.id}/status`, 'PATCH', {
        isActive: !driver.isActive,
      });
      setDrivers((current) =>
        current.map((item) => (item.id === driver.id ? { ...item, ...updated } : item)),
      );
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'İşlem başarısız oldu.');
    } finally {
      setBusy(null);
    }
  }

  async function assign(trip: AdminTrip, driverId: string) {
    setBusy(trip.id);
    setError('');
    try {
      if (!driverId) {
        await request(`driver-operations/trips/${trip.id}/driver`, 'DELETE');
        setTrips((current) =>
          current.map((item) => (item.id === trip.id ? { ...item, driver: null } : item)),
        );
      } else {
        const assignment = await request(`driver-operations/trips/${trip.id}/driver`, 'PUT', {
          driverId,
        });
        const driver = drivers.find((item) => item.id === assignment.driverId);
        setTrips((current) =>
          current.map((item) => (item.id === trip.id ? { ...item, driver: driver || null } : item)),
        );
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'İşlem başarısız oldu.');
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Operasyon"
        title="Sürücü yönetimi"
        description="Sürücü hesaplarını ve sefer atamalarını yönetin."
      />
      {error ? (
        <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">
          {error}
        </p>
      ) : null}
      <Card>
        <CardHeader>
          <CardTitle>Sürücü dizini</CardTitle>
          <CardDescription>Aktiflik durumunu buradan yönetin.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {drivers.map((driver) => (
            <div
              key={driver.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-ink-200/80 p-3"
            >
              <div>
                <p className="font-semibold text-ink-900">
                  {driver.firstName} {driver.lastName}
                </p>
                <p className="text-xs text-ink-500">{driver.email}</p>
              </div>
              <div className="flex items-center gap-3">
                <Badge tone={driver.isActive ? 'live' : 'warn'}>
                  {driver.isActive ? 'Aktif' : 'Pasif'}
                </Badge>
                <button
                  className="ops-btn ops-btn-secondary"
                  disabled={busy === driver.id}
                  onClick={() => toggle(driver)}
                >
                  {busy === driver.id
                    ? 'Bekleyin…'
                    : driver.isActive
                      ? 'Pasifleştir'
                      : 'Aktifleştir'}
                </button>
              </div>
            </div>
          ))}
          {!drivers.length ? <p className="py-4 text-sm text-ink-500">Sürücü bulunmuyor.</p> : null}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Sefer atamaları</CardTitle>
          <CardDescription>
            Atama değiştirildiğinde mevcut sürücünün yerine yenisi atanır. Boş seçenek atamayı
            kaldırır.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {trips.map((trip) => (
            <div
              key={trip.id}
              className="grid gap-2 rounded-xl border border-ink-200/80 p-3 md:grid-cols-[1fr_18rem] md:items-center"
            >
              <div>
                <p className="font-semibold text-ink-900">
                  {trip.originName} → {trip.destinationName}
                </p>
                <p className="text-xs text-ink-500">
                  {new Date(trip.departureTime).toLocaleString('tr-TR')} · {trip.plateNumber}
                </p>
              </div>
              <select
                aria-label={`${trip.originName} ${trip.destinationName} sürücüsü`}
                className="min-h-10 rounded-xl border border-ink-200 bg-white px-3 text-sm"
                value={trip.driver?.id || ''}
                disabled={busy === trip.id}
                onChange={(event) => assign(trip, event.target.value)}
              >
                <option value="">Atama yok</option>
                {drivers
                  .filter((driver) => driver.isActive)
                  .map((driver) => (
                    <option key={driver.id} value={driver.id}>
                      {driver.firstName} {driver.lastName}
                    </option>
                  ))}
              </select>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
