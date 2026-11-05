import type { Passenger, Trip } from '@/components/DriverProvider';
import { toLngLat, type LngLat } from './geo';
import { shortName } from './format';
import { measureRoute, projectOnRoute, type Coordinates } from './route-math';

export type BoardingStatus = Passenger['boardingStatus'];

export type TripStop = {
  id: string;
  index: number;
  name: string;
  short: string;
  time: Date;
  point: LngLat | null;
};

export type Person = {
  id: string;
  seat: string;
  name: string;
  first: string;
  /** "Rojda A." for the tight seat labels. */
  short: string;
  phone: string | null;
  from: number;
  to: number;
  status: BoardingStatus;
};

export type StopCounts = {
  down: number;
  downDone: number;
  up: number;
  upDone: number;
  upNo: number;
};

export type SeatKind = 'empty' | 'occ' | 'down' | 'swap' | 'up' | 'upDone' | 'downDone' | 'noshow';

export type SeatState = {
  kind: SeatKind;
  /** Passenger whose journey ends at this stop. */
  alighting: Person | null;
  /** Passenger whose journey starts at this stop. */
  boarding: Person | null;
  /** Passenger riding through this stop. */
  through: Person | null;
};

export function tripStops(trip: Trip): TripStop[] {
  const departure = new Date(trip.departureTime).getTime();
  return [...trip.route.stops]
    .sort((a, b) => a.stopOrder - b.stopOrder)
    .map((stop, index) => ({
      id: stop.id,
      index,
      name: stop.location.name,
      short: shortName(stop.location.name),
      time: new Date(departure + stop.estimatedMinutesFromStart * 60_000),
      point: toLngLat(stop.location.coordinates),
    }));
}

/** Each ticket as a leg between stop indexes; orders without stops ride the whole route. */
export function tripPeople(trip: Trip): Person[] {
  const ordered = [...trip.route.stops].sort((a, b) => a.stopOrder - b.stopOrder);
  const indexOf = (locationId: string | null, fallback: number) => {
    const index = ordered.findIndex((stop) => stop.locationId === locationId);
    return index >= 0 ? index : fallback;
  };
  return trip.manifest.map((passenger) => {
    const name = `${passenger.firstName} ${passenger.lastName}`.trim();
    return {
      id: passenger.ticketId,
      seat: passenger.seatNo,
      name,
      first: passenger.firstName,
      short: `${passenger.firstName} ${passenger.lastName.charAt(0)}.`,
      phone: passenger.phone,
      from: indexOf(passenger.boardingLocationId, 0),
      to: indexOf(passenger.alightingLocationId, ordered.length - 1),
      status: passenger.boardingStatus,
    };
  });
}

export function stopCounts(people: Person[], stop: number): StopCounts {
  const counts: StopCounts = { down: 0, downDone: 0, up: 0, upDone: 0, upNo: 0 };
  for (const person of people) {
    if (person.to === stop && person.status !== 'no_show') {
      counts.down += 1;
      if (person.status === 'alighted') counts.downDone += 1;
    }
    if (person.from === stop) {
      counts.up += 1;
      if (person.status === 'boarded' || person.status === 'alighted') counts.upDone += 1;
      if (person.status === 'no_show') counts.upNo += 1;
    }
  }
  return counts;
}

export function seatState(people: Person[], seat: string, stop: number): SeatState {
  let alighting: Person | null = null;
  let boarding: Person | null = null;
  let through: Person | null = null;
  for (const person of people) {
    if (person.seat !== seat) continue;
    if (person.to === stop && (person.status === 'boarded' || person.status === 'alighted')) {
      alighting = person;
    } else if (person.from === stop) {
      boarding = person;
    } else if (person.from < stop && person.to > stop && person.status === 'boarded') {
      through = person;
    }
  }

  let kind: SeatKind = 'empty';
  if (alighting?.status === 'boarded') kind = boarding?.status === 'pending' ? 'swap' : 'down';
  else if (boarding?.status === 'pending') kind = 'up';
  else if (boarding?.status === 'boarded') kind = 'upDone';
  else if (boarding?.status === 'no_show') kind = 'noshow';
  else if (through) kind = 'occ';
  else if (alighting?.status === 'alighted') kind = 'downDone';
  return { kind, alighting, boarding, through };
}

/** Still to be handled at this stop: on board and getting off, or waiting to get on. */
export function isWaiting(person: Person, stop: number) {
  return (
    (person.to === stop && person.status === 'boarded') ||
    (person.from === stop && person.status === 'pending')
  );
}

export function firstNames(people: Person[]) {
  if (!people.length) return 'Kimse yok';
  const names = people
    .slice(0, 3)
    .map((person) => person.first)
    .join(', ');
  return people.length > 3 ? `${names} +${people.length - 3}` : names;
}

export function routeCoordinates(trip: Trip, stops: TripStop[]): Coordinates {
  const geometry = trip.route.geometry?.coordinates;
  if (geometry && geometry.length >= 2) return geometry;
  return stops.flatMap((stop) =>
    stop.point ? [[stop.point.longitude, stop.point.latitude] as [number, number]] : [],
  );
}

/**
 * Where a trip stands when this device has no saved progress: from the last GPS fix when there is
 * one, otherwise from the trip status alone.
 */
export function initialProgress(
  trip: Trip,
  stops: TripStop[],
  coordinates: Coordinates,
): { stop: number; view: 'durak' | 'yolda' } {
  if (trip.status !== 'in_transit') return { stop: 0, view: 'durak' };
  const position = trip.latestPosition;
  if (!position || coordinates.length < 2)
    return { stop: Math.min(1, stops.length - 1), view: 'yolda' };
  const cumulative = measureRoute(coordinates);
  const bus = projectOnRoute(coordinates, cumulative, position).km;
  const next = stops.findIndex(
    (stop) => stop.point && projectOnRoute(coordinates, cumulative, stop.point).km > bus + 0.4,
  );
  return next <= 0
    ? { stop: next === 0 ? 0 : stops.length - 1, view: 'durak' }
    : { stop: next, view: 'yolda' };
}
