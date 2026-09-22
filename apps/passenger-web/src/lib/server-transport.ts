import { ServerError, transportService, type TripSearch } from '@ekspres/database';

export function transportErrorResponse(error: unknown) {
  const status = error instanceof ServerError ? error.status : 500;
  const message = error instanceof ServerError ? error.message : 'İşlem şu anda tamamlanamıyor.';
  if (status === 500) console.error('Passenger transport query failed');
  return Response.json({ message }, { status, headers: { 'Cache-Control': 'no-store' } });
}

export function getLocations() {
  return transportService.getLocations();
}

export function getRoutes() {
  return transportService.getRoutes();
}

export function getTrips(search: TripSearch = {}) {
  return transportService.getTrips(search);
}

export function getTripDetails(tripId: string) {
  return transportService.getTripDetails(tripId);
}
