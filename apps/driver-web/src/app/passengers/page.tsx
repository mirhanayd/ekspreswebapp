'use client';

import { useMemo, useState } from 'react';
import { Check, MapPin, Undo2, UserRoundX, Users } from 'lucide-react';
import { useDriver, type Passenger } from '@/components/DriverProvider';
import {
  boardingText,
  DriverPageShell,
  formatTime,
  stopTime,
  TicketCheckButton,
} from '@/components/DriverUI';

type Segment = Passenger['boardingStatus'];

const segments: Array<{ id: Segment; label: string }> = [
  { id: 'pending', label: 'Bekliyor' },
  { id: 'boarded', label: 'Bindi' },
  { id: 'no_show', label: 'Gelmedi' },
];

export default function DriverPassengersPage() {
  return (
    <DriverPageShell cta>
      <DriverPassengersContent />
    </DriverPageShell>
  );
}

function DriverPassengersContent() {
  const { trip, counts } = useDriver();
  const [segment, setSegment] = useState<Segment>('pending');

  const groups = useMemo(() => {
    if (!trip) return [];
    const names = new Map(trip.route.stops.map((stop) => [stop.locationId, stop.location.name]));
    const alighting = (passenger: Passenger) =>
      (passenger.alightingLocationId && names.get(passenger.alightingLocationId)) ||
      trip.route.destination.name;

    const stops = [...trip.route.stops].sort((a, b) => a.stopOrder - b.stopOrder);
    const grouped = new Set<string>();
    const result = stops.map((stop) => {
      stop.passengers.forEach((passenger) => grouped.add(passenger.ticketId));
      return {
        id: stop.id,
        name: stop.location.name,
        time: formatTime(stopTime(trip, stop.estimatedMinutesFromStart)),
        passengers: stop.passengers.map((passenger) => ({
          passenger,
          alighting: alighting(passenger),
        })),
      };
    });
    const rest = trip.manifest.filter((passenger) => !grouped.has(passenger.ticketId));
    if (rest.length) {
      result.push({
        id: 'unassigned-stop',
        name: 'Biniş durağı belirtilmemiş',
        time: '',
        passengers: rest.map((passenger) => ({ passenger, alighting: alighting(passenger) })),
      });
    }
    return result;
  }, [trip]);

  if (!trip) return null;

  const segmentCount: Record<Segment, number> = {
    pending: counts.pending,
    boarded: counts.boarded,
    no_show: counts.noShow,
  };
  const visible = groups
    .map((group) => ({
      ...group,
      passengers: group.passengers.filter((item) => item.passenger.boardingStatus === segment),
    }))
    .filter((group) => group.passengers.length > 0);

  return (
    <>
      <header className="page-head">
        <div>
          <h1>Yolcular</h1>
          <p>
            {counts.total} yolcu · {trip.route.origin.name} → {trip.route.destination.name}
          </p>
        </div>
      </header>

      <div className="segment" role="tablist" aria-label="Biniş durumu">
        {segments.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={segment === item.id}
            onClick={() => setSegment(item.id)}
          >
            {item.label}
            <b>{segmentCount[item.id]}</b>
          </button>
        ))}
      </div>

      {visible.map((group) => (
        <section key={group.id} className="stop-group" aria-label={group.name}>
          <div className="stop-group-head">
            <strong>{group.name}</strong>
            <span>
              {group.time ? `${group.time} · ` : ''}
              {group.passengers.length} kişi
            </span>
          </div>
          {group.passengers.map(({ passenger, alighting }) => (
            <PassengerRow key={passenger.ticketId} passenger={passenger} alighting={alighting} />
          ))}
        </section>
      ))}

      {!visible.length ? (
        <section className="card empty">
          <Users aria-hidden />
          <strong>
            {!counts.total
              ? 'Bu sefer için satılmış bilet yok'
              : `${boardingText[segment]} durumunda yolcu yok`}
          </strong>
        </section>
      ) : null}

      <div className="sticky-cta">
        <TicketCheckButton className="btn btn-primary btn-lg" />
      </div>
    </>
  );
}

function PassengerRow({ passenger, alighting }: { passenger: Passenger; alighting: string }) {
  const { setPassengerStatus, busyTickets } = useDriver();
  const busy = busyTickets.has(passenger.ticketId);
  const name = `${passenger.firstName} ${passenger.lastName}`;

  return (
    <article className="pax-row">
      <span className="seat" aria-label={`Koltuk ${passenger.seatNo}`}>
        {passenger.seatNo}
      </span>
      <div className="pax-main">
        <strong>{name}</strong>
        <span>
          <MapPin aria-hidden />
          İniş: {alighting}
        </span>
      </div>
      {passenger.boardingStatus === 'pending' ? (
        <div className="pax-actions">
          <button
            type="button"
            className="btn btn-danger-outline"
            disabled={busy}
            onClick={() => void setPassengerStatus(passenger.ticketId, 'no_show')}
            aria-label={`${name} gelmedi`}
          >
            <UserRoundX aria-hidden />
            Gelmedi
          </button>
          <button
            type="button"
            className="btn btn-ok"
            disabled={busy}
            onClick={() => void setPassengerStatus(passenger.ticketId, 'boarded')}
            aria-label={`${name} bindi`}
          >
            <Check aria-hidden />
            Bindi
          </button>
        </div>
      ) : (
        <div className="pax-state">
          <span className={`chip chip-${passenger.boardingStatus}`}>
            {boardingText[passenger.boardingStatus]}
          </span>
          <button
            type="button"
            className="btn btn-ghost"
            disabled={busy}
            onClick={() => void setPassengerStatus(passenger.ticketId, 'pending')}
            aria-label={`${name} durumunu geri al`}
          >
            <Undo2 aria-hidden />
            Geri al
          </button>
        </div>
      )}
    </article>
  );
}
