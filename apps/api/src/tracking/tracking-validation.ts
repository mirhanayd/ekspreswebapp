import { TrackingPosition } from './tracking.types';

export const MAX_TRACKING_SPEED_KPH = 180;
export const MAX_TRACKING_GROUND_SPEED_KPH = 220;
export const MAX_TRACKING_CLOCK_SKEW_MS = 5 * 60_000;
export const MAX_TRACKING_AGE_MS = 10 * 60_000;

const EARTH_RADIUS_KM = 6_371;

export function distanceKm(
  a: Pick<TrackingPosition, 'latitude' | 'longitude'>,
  b: Pick<TrackingPosition, 'latitude' | 'longitude'>,
) {
  const latitudeDelta = toRadians(b.latitude - a.latitude);
  const longitudeDelta = toRadians(b.longitude - a.longitude);
  const haversine =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(toRadians(a.latitude)) *
      Math.cos(toRadians(b.latitude)) *
      Math.sin(longitudeDelta / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(haversine));
}

export function validateTrackingSample(
  sample: Pick<
    TrackingPosition,
    'latitude' | 'longitude' | 'speedKph' | 'headingDeg' | 'recordedAt'
  >,
  previous: TrackingPosition | null,
  now = Date.now(),
): string | null {
  if (
    !Number.isFinite(sample.latitude) ||
    sample.latitude < -90 ||
    sample.latitude > 90 ||
    !Number.isFinite(sample.longitude) ||
    sample.longitude < -180 ||
    sample.longitude > 180
  ) {
    return 'GPS coordinates are outside the valid range';
  }
  if (
    !Number.isFinite(sample.speedKph) ||
    sample.speedKph < 0 ||
    sample.speedKph > MAX_TRACKING_SPEED_KPH
  ) {
    return 'GPS speed is outside the valid range';
  }
  if (!Number.isFinite(sample.headingDeg) || sample.headingDeg < 0 || sample.headingDeg > 360) {
    return 'GPS heading is outside the valid range';
  }

  const recordedAt = Date.parse(sample.recordedAt);
  if (!Number.isFinite(recordedAt)) return 'GPS sample timestamp is invalid';
  if (recordedAt > now + MAX_TRACKING_CLOCK_SKEW_MS) return 'GPS sample is from the future';
  if (recordedAt < now - MAX_TRACKING_AGE_MS) return 'GPS sample is stale';
  if (!previous) return null;
  const previousRecordedAt = Date.parse(previous.recordedAt);
  if (!Number.isFinite(previousRecordedAt) || recordedAt <= previousRecordedAt) {
    return 'GPS sample is not newer than the latest sample';
  }

  const elapsedHours = (recordedAt - previousRecordedAt) / 3_600_000;
  const impliedSpeedKph = distanceKm(previous, sample) / elapsedHours;
  if (impliedSpeedKph > MAX_TRACKING_GROUND_SPEED_KPH) {
    return 'GPS sample implies implausible movement';
  }
  return null;
}

function toRadians(value: number) {
  return (value * Math.PI) / 180;
}
