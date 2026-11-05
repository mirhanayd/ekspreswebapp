import { ServerError } from './errors.js';

type ManifestPassenger = {
  ticketId: string;
  ticketNo: string;
  seatNo: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  boardingLocationId: string | null;
  alightingLocationId: string | null;
  boardingStatus: string;
};

type RouteStop = {
  locationId: string;
  stopOrder: number;
  estimatedMinutesFromStart: number;
  location: { name: string };
};

type StopTrip = {
  departureTime: Date | string;
  route: { originId: string; destinationId: string; stops: RouteStop[] };
};

export type StopPoint = { locationId: string; name: string; plannedTime: string };

export type StopPassenger = {
  ticketId: string;
  ticketNo: string;
  seatNo: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  boardingStop: StopPoint;
  alightingStop: StopPoint;
  boardingStatus: string;
};

export type StopSummary = StopPoint & {
  stopOrder: number;
  alightingCount: number;
  boardingCount: number;
};

/**
 * One stop as the driver sees it, plus counts for every stop on the route. A ticket without a
 * stop rides the whole route, and so does one naming a stop this route no longer has, so every
 * passenger appears at exactly one boarding stop and one alighting stop.
 */
export function buildStopManifest(
  trip: StopTrip,
  manifest: ManifestPassenger[],
  locationId: string,
) {
  const departure = new Date(trip.departureTime).getTime();
  const stops = [...trip.route.stops].sort((a, b) => a.stopOrder - b.stopOrder);
  const points = new Map<string, StopPoint>(
    stops.map((stop) => [
      stop.locationId,
      {
        locationId: stop.locationId,
        name: stop.location.name,
        plannedTime: new Date(departure + stop.estimatedMinutesFromStart * 60_000).toISOString(),
      },
    ]),
  );
  const onRoute = (id: string | null, fallback: string) =>
    id !== null && points.has(id) ? id : fallback;

  const passengers = manifest.map((passenger) => {
    const boardingId = onRoute(passenger.boardingLocationId, trip.route.originId);
    const alightingId = onRoute(passenger.alightingLocationId, trip.route.destinationId);
    const view: StopPassenger = {
      ticketId: passenger.ticketId,
      ticketNo: passenger.ticketNo,
      seatNo: passenger.seatNo,
      firstName: passenger.firstName,
      lastName: passenger.lastName,
      phone: passenger.phone,
      boardingStop: points.get(boardingId) as StopPoint,
      alightingStop: points.get(alightingId) as StopPoint,
      boardingStatus: passenger.boardingStatus,
    };
    return view;
  });

  const current = stops.find((stop) => stop.locationId === locationId);
  if (!current) throw new ServerError(404, 'Durak bu seferin güzergâhında değil.');

  return {
    stop: {
      ...(points.get(locationId) as StopPoint),
      stopOrder: current.stopOrder,
    },
    alighting: passengers.filter((item) => item.alightingStop.locationId === locationId),
    boarding: passengers.filter((item) => item.boardingStop.locationId === locationId),
    stops: stops.map<StopSummary>((stop) => ({
      ...(points.get(stop.locationId) as StopPoint),
      stopOrder: stop.stopOrder,
      // A no-show never got on, so they are not someone to expect off the bus.
      alightingCount: passengers.filter(
        (item) =>
          item.alightingStop.locationId === stop.locationId && item.boardingStatus !== 'no_show',
      ).length,
      boardingCount: passengers.filter((item) => item.boardingStop.locationId === stop.locationId)
        .length,
    })),
  };
}
