'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CircleCheck, History, Lock, UserRoundCheck, UserX } from 'lucide-react';
import { Avatar, EmptyRow, OccupancyBar, StatusChip } from '@/components/ui';
import type { AdminTrip } from '@/lib/admin-types';
import {
  formatClock,
  formatDay,
  initials,
  isClosedTrip,
  tripCode,
  tripsOverlap,
} from '@/lib/trip-status';
import { request, type DriverRecord, type RequestError } from './DriverManagement';

type Filter = 'all' | 'scheduled' | 'boarding' | 'in_transit' | 'completed' | 'unassigned';

const filters: Array<{ id: Filter; label: string }> = [
  { id: 'all', label: 'Tümü' },
  { id: 'scheduled', label: 'Planlandı' },
  { id: 'boarding', label: 'Yolcu alımı' },
  { id: 'in_transit', label: 'Yolda' },
  { id: 'completed', label: 'Tamamlandı' },
  { id: 'unassigned', label: 'Şoförsüz' },
];

const matches = (trip: AdminTrip, filter: Filter) =>
  filter === 'all'
    ? true
    : filter === 'unassigned'
      ? !trip.driverId && !isClosedTrip(trip.status)
      : trip.status === filter;

type RecentAction = { id: number; at: Date; text: string };

export function TripsBoard({
  trips,
  drivers,
  initialTripId,
}: {
  trips: AdminTrip[];
  drivers: DriverRecord[];
  initialTripId: string | null;
}) {
  const [filter, setFilter] = useState<Filter>('all');
  const [selectedId, setSelectedId] = useState<string | null>(
    trips.find((trip) => trip.id === initialTripId)?.id ??
      trips.find((trip) => !trip.driverId && !isClosedTrip(trip.status))?.id ??
      trips[0]?.id ??
      null,
  );
  const [recent, setRecent] = useState<RecentAction[]>([]);
  const panel = useRef<HTMLDivElement>(null);
  const driverById = useMemo(() => new Map(drivers.map((d) => [d.id, d])), [drivers]);

  const sorted = useMemo(
    () => [...trips].sort((a, b) => a.departureTime.localeCompare(b.departureTime)),
    [trips],
  );
  const visible = sorted.filter((trip) => matches(trip, filter));
  const selected = trips.find((trip) => trip.id === selectedId) ?? null;

  useEffect(() => {
    if (initialTripId) panel.current?.scrollIntoView({ block: 'start' });
  }, [initialTripId]);

  const select = (tripId: string) => {
    setSelectedId(tripId);
    // Stacked layout on phones/tablets: bring the assignment panel into view.
    if (window.matchMedia('(max-width: 1279px)').matches) {
      panel.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const log = (text: string) =>
    setRecent((items) => [{ id: Date.now(), at: new Date(), text }, ...items].slice(0, 8));

  return (
    <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_22rem]">
      <section className="surface min-w-0" aria-label="Sefer listesi">
        <div
          className="no-scrollbar flex gap-1.5 overflow-x-auto border-b border-adm-line p-3"
          role="tablist"
          aria-label="Durum filtresi"
        >
          {filters.map((item) => {
            const count = trips.filter((trip) => matches(trip, item.id)).length;
            const active = filter === item.id;
            return (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setFilter(item.id)}
                className={`inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-3 text-sm font-medium transition ${
                  active
                    ? 'border-adm-text bg-adm-text text-white'
                    : 'border-adm-line bg-white text-adm-muted hover:text-adm-text'
                }`}
              >
                {item.label}
                <span
                  className={`rounded-full px-1.5 text-xs ${active ? 'bg-white/20' : 'bg-adm-bg'}`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        <div className="overflow-x-auto">
          <table className="data-grid">
            <thead>
              <tr>
                <th scope="col">Saat</th>
                <th scope="col">Güzergâh</th>
                <th scope="col">Araç</th>
                <th scope="col">Şoför</th>
                <th scope="col">Doluluk</th>
                <th scope="col">Durum</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((trip) => {
                const driver = trip.driverId ? driverById.get(trip.driverId) : undefined;
                const active = trip.id === selectedId;
                return (
                  <tr
                    key={trip.id}
                    onClick={() => select(trip.id)}
                    className={`cursor-pointer ${active ? '!bg-adm-sel-bg' : ''}`}
                    aria-selected={active}
                  >
                    <td className="whitespace-nowrap">
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          select(trip.id);
                        }}
                        className="text-left"
                        aria-label={`${tripCode(trip.id)} seferini seç`}
                      >
                        <span className="block font-medium">{formatClock(trip.departureTime)}</span>
                        <span className="block font-mono text-xs text-adm-muted">
                          {tripCode(trip.id)}
                        </span>
                      </button>
                    </td>
                    <td>
                      <p className="whitespace-nowrap font-medium">
                        {trip.originName} → {trip.destinationName}
                      </p>
                      <p className="whitespace-nowrap text-xs text-adm-muted">
                        {formatDay(trip.departureTime)} · varış {formatClock(trip.arrivalTime)}
                      </p>
                    </td>
                    <td>
                      <span className="plate">{trip.plateNumber}</span>
                    </td>
                    <td>
                      {driver ? (
                        <span className="flex items-center gap-2 whitespace-nowrap">
                          <Avatar name={initials(driver.firstName, driver.lastName)} />
                          {driver.firstName} {driver.lastName}
                        </span>
                      ) : (
                        <span className="whitespace-nowrap text-adm-muted">Atanmadı</span>
                      )}
                    </td>
                    <td>
                      <OccupancyBar sold={trip.soldSeats} total={trip.totalSeats} />
                    </td>
                    <td>
                      <StatusChip status={trip.status} />
                    </td>
                  </tr>
                );
              })}
              {!visible.length ? <EmptyRow colSpan={6}>Bu filtrede sefer yok.</EmptyRow> : null}
            </tbody>
          </table>
        </div>
      </section>

      <div ref={panel} className="min-w-0 scroll-mt-24 space-y-3">
        {selected ? (
          <AssignPanel
            key={selected.id}
            trip={selected}
            trips={trips}
            drivers={drivers}
            onDone={log}
          />
        ) : (
          <section className="surface p-5 text-sm text-adm-muted">
            Şoför atamak için bir sefer seçin.
          </section>
        )}

        <section className="surface" aria-label="Son işlemler">
          <div className="flex items-center gap-2 border-b border-adm-line px-4 py-3">
            <History className="h-4 w-4 text-adm-muted" aria-hidden />
            <h2 className="text-sm font-semibold">Son işlemler</h2>
            <span className="ml-auto text-xs text-adm-muted">Bu oturum</span>
          </div>
          {recent.length ? (
            <ul className="divide-y divide-adm-line">
              {recent.map((item) => (
                <li key={item.id} className="flex gap-3 px-4 py-3 text-sm">
                  <span className="shrink-0 font-mono text-xs text-adm-muted">
                    {formatClock(item.at)}
                  </span>
                  <span className="min-w-0">{item.text}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-4 py-5 text-sm text-adm-muted">
              Bu oturumda yaptığınız atamalar burada görünür; tüm işlemler ayrıca denetim kaydına
              yazılır.
            </p>
          )}
        </section>
      </div>
    </div>
  );
}

function AssignPanel({
  trip,
  trips,
  drivers,
  onDone,
}: {
  trip: AdminTrip;
  trips: AdminTrip[];
  drivers: DriverRecord[];
  // eslint-disable-next-line no-unused-vars
  onDone: (text: string) => void;
}) {
  const router = useRouter();
  const locked = isClosedTrip(trip.status);
  const [selected, setSelected] = useState(trip.driverId ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState('');
  const [override, setOverride] = useState(false);
  const [reason, setReason] = useState('');

  const current = drivers.find((driver) => driver.id === trip.driverId);
  const conflicts = useMemo(() => {
    const map = new Map<string, AdminTrip>();
    trips.forEach((other) => {
      if (other.id === trip.id || !other.driverId || isClosedTrip(other.status)) return;
      if (tripsOverlap(trip, other)) map.set(other.driverId, other);
    });
    return map;
  }, [trip, trips]);

  const candidates = drivers.filter((driver) => driver.isActive || driver.id === trip.driverId);
  const target = drivers.find((driver) => driver.id === selected);
  const targetConflict = selected ? conflicts.get(selected) : undefined;

  async function save(method: 'PUT' | 'DELETE') {
    if (method === 'PUT' && override && reason.trim().length < 3) {
      setError('Çakışmayı geçmek için en az 3 karakterlik gerekçe yazın.');
      return;
    }
    setBusy(true);
    setError('');
    setSaved('');
    try {
      await request(
        `trips/${trip.id}/driver`,
        method,
        method === 'PUT' ? { driverId: selected, override, reason } : undefined,
      );
      const name = target ? `${target.firstName} ${target.lastName}` : '';
      if (method === 'PUT') {
        setSaved(`${name} atandı.`);
        onDone(`${tripCode(trip.id)} · ${name} atandı${override ? ' (çakışma gerekçeli)' : ''}`);
      } else {
        setSelected('');
        setSaved('Atama kaldırıldı.');
        onDone(`${tripCode(trip.id)} · şoför ataması kaldırıldı`);
      }
      setOverride(false);
      setReason('');
      router.refresh();
    } catch (cause) {
      const failure = cause as RequestError;
      setError(
        failure.code === 'TRIP_OVERLAP'
          ? `${failure.message} Yine de atamak için “Çakışmayı gerekçeyle geç” seçin.`
          : failure instanceof Error
            ? failure.message
            : 'Atama güncellenemedi.',
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="surface" aria-label="Şoför ata">
      <div className="border-b border-adm-line px-4 py-3">
        <h2 className="text-base font-semibold">Şoför ata</h2>
      </div>
      <div className="space-y-4 p-4">
        <div className="rounded-card bg-adm-bg p-3">
          <div className="flex items-center justify-between gap-2">
            <span className="font-mono text-xs text-adm-muted">{tripCode(trip.id)}</span>
            <StatusChip status={trip.status} />
          </div>
          <p className="mt-2 font-medium">
            {trip.originName} → {trip.destinationName}
          </p>
          <p className="mt-0.5 text-sm text-adm-muted">
            {formatDay(trip.departureTime)} · {formatClock(trip.departureTime)}–
            {formatClock(trip.arrivalTime)}
          </p>
          <div className="mt-2 flex items-center gap-2 text-sm">
            <span className="plate">{trip.plateNumber}</span>
            <span className="text-adm-muted">
              {trip.soldSeats}/{trip.totalSeats} yolcu
            </span>
          </div>
        </div>

        {locked ? (
          <p className="flex items-center gap-2 text-sm text-adm-muted">
            <Lock className="h-4 w-4" aria-hidden />
            {current ? `${current.firstName} ${current.lastName}` : 'Şoför atanmadı'} · sefer kapalı
          </p>
        ) : (
          <>
            <fieldset disabled={busy}>
              <legend className="mb-2 text-sm font-medium text-adm-muted">Müsait şoförler</legend>
              <ul className="space-y-1.5">
                {candidates.map((driver) => {
                  const conflict = conflicts.get(driver.id);
                  const disabled = (Boolean(conflict) && !override) || !driver.isActive;
                  const checked = selected === driver.id;
                  return (
                    <li key={driver.id}>
                      <label
                        className={`flex min-h-12 items-center gap-3 rounded-btn border px-3 py-2 text-sm transition ${
                          checked
                            ? 'border-adm-brand bg-adm-sel-bg'
                            : 'border-adm-line hover:bg-adm-bg'
                        } ${disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}
                      >
                        <input
                          type="radio"
                          name={`driver-${trip.id}`}
                          value={driver.id}
                          checked={checked}
                          disabled={disabled}
                          onChange={() => setSelected(driver.id)}
                          className="h-4 w-4 accent-[#B8261B]"
                        />
                        <Avatar name={initials(driver.firstName, driver.lastName)} />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-medium">
                            {driver.firstName} {driver.lastName}
                          </span>
                          <span className="block truncate text-xs text-adm-muted">
                            {conflict
                              ? `${conflict.originName} → ${conflict.destinationName} · ${formatClock(conflict.departureTime)}`
                              : driver.email}
                          </span>
                        </span>
                        {driver.id === trip.driverId ? (
                          <span className="chip-status chip-live">Mevcut</span>
                        ) : conflict ? (
                          <span className="chip-status chip-danger">Çakışma</span>
                        ) : !driver.isActive ? (
                          <span className="chip-status chip-neutral">Pasif</span>
                        ) : null}
                      </label>
                    </li>
                  );
                })}
                {!candidates.length ? (
                  <li className="text-sm text-adm-muted">Aktif sürücü hesabı yok.</li>
                ) : null}
              </ul>
            </fieldset>

            <label className="flex items-center gap-2 text-sm text-adm-muted">
              <input
                type="checkbox"
                checked={override}
                onChange={(event) => setOverride(event.target.checked)}
                disabled={busy}
                className="h-4 w-4 accent-[#B8261B]"
              />
              Çakışmayı gerekçeyle geç
            </label>
            {override ? (
              <label className="block text-sm font-medium">
                Gerekçe
                <input
                  className="ops-field mt-1"
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                  minLength={3}
                  maxLength={500}
                  required
                />
              </label>
            ) : null}

            {error ? (
              <p role="alert" className="text-sm text-[#991B1B]">
                {error}
              </p>
            ) : null}
            {saved && !error ? (
              <p role="status" className="flex items-center gap-1.5 text-sm text-[#166534]">
                <CircleCheck className="h-4 w-4" aria-hidden />
                {saved}
              </p>
            ) : null}

            <div className="flex flex-col gap-2">
              <button
                type="button"
                className="ops-btn ops-btn-primary w-full"
                disabled={
                  busy ||
                  !selected ||
                  selected === trip.driverId ||
                  !target?.isActive ||
                  (Boolean(targetConflict) && !override)
                }
                onClick={() => save('PUT')}
              >
                <UserRoundCheck className="h-4 w-4" aria-hidden />
                {busy ? 'Kaydediliyor…' : trip.driverId ? 'Şoförü değiştir' : 'Şoförü ata'}
              </button>
              {trip.driverId ? (
                <button
                  type="button"
                  className="ops-btn ops-btn-secondary w-full"
                  disabled={busy}
                  onClick={() => {
                    if (window.confirm('Bu seferdeki sürücü ataması kaldırılsın mı?')) {
                      void save('DELETE');
                    }
                  }}
                >
                  <UserX className="h-4 w-4" aria-hidden />
                  Atamayı kaldır
                </button>
              ) : null}
            </div>
          </>
        )}
      </div>
    </section>
  );
}
