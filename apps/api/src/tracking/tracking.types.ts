export type TrackingPosition = {
  tripId: string;
  busId: string;
  longitude: number;
  latitude: number;
  speedKph: number;
  headingDeg: number;
  recordedAt: string;
  sequence: number;
  source: 'SIMULATOR' | 'GPS_DEVICE' | 'MOBILE_APP';
};

export type TrackingAccessClaims = {
  purpose: 'tracking';
  sub: string;
  ticketId: string;
  tripId: string;
};

export function isTrackingPosition(value: unknown): value is TrackingPosition {
  if (!value || typeof value !== 'object') return false;
  const position = value as Record<string, unknown>;
  return (
    typeof position.tripId === 'string' &&
    typeof position.busId === 'string' &&
    Number.isFinite(position.longitude) &&
    Number.isFinite(position.latitude) &&
    Number.isFinite(position.speedKph) &&
    Number.isFinite(position.headingDeg) &&
    typeof position.recordedAt === 'string' &&
    Number.isInteger(position.sequence) &&
    ['SIMULATOR', 'GPS_DEVICE', 'MOBILE_APP'].includes(String(position.source))
  );
}
