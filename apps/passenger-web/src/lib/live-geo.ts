import type { RouteMetrics } from './route-progress';

type LngLat = [number, number];

const EARTH_RADIUS_KM = 6371;
const toRadians = (value: number) => (value * Math.PI) / 180;
const toDegrees = (value: number) => (value * 180) / Math.PI;

/** Closed polygon ring `radiusKm` around `center`, for the 5 km and 1 km approach circles. */
export function circleRing(center: LngLat, radiusKm: number, steps = 72): LngLat[] {
  const [longitude, latitude] = center;
  const angular = radiusKm / EARTH_RADIUS_KM;
  const lat = toRadians(latitude);
  const lon = toRadians(longitude);
  const ring: LngLat[] = [];
  for (let step = 0; step <= steps; step += 1) {
    const bearing = (step / steps) * 2 * Math.PI;
    const pointLat = Math.asin(
      Math.sin(lat) * Math.cos(angular) + Math.cos(lat) * Math.sin(angular) * Math.cos(bearing),
    );
    const pointLon =
      lon +
      Math.atan2(
        Math.sin(bearing) * Math.sin(angular) * Math.cos(lat),
        Math.cos(angular) - Math.sin(lat) * Math.sin(pointLat),
      );
    ring.push([toDegrees(pointLon), toDegrees(pointLat)]);
  }
  return ring;
}

/** The point `km` along the route from its start (clamped to the line). */
export function pointAtRouteKm(coordinates: LngLat[], metrics: RouteMetrics, km: number): LngLat {
  const target = Math.min(Math.max(km, 0), metrics.totalKm);
  for (let index = 1; index < coordinates.length; index += 1) {
    if (metrics.cumulative[index] >= target) {
      const span = metrics.cumulative[index] - metrics.cumulative[index - 1];
      const t = span ? (target - metrics.cumulative[index - 1]) / span : 0;
      const [x1, y1] = coordinates[index - 1];
      const [x2, y2] = coordinates[index];
      return [x1 + (x2 - x1) * t, y1 + (y2 - y1) * t];
    }
  }
  return coordinates[coordinates.length - 1];
}

/**
 * Zoom that keeps both the bus and its stop in the visible part of the map: the
 * closer the bus gets, the further the camera moves in. Calibrated for a ~230 px
 * wide span at this latitude.
 */
export function zoomForDistance(km: number) {
  const zoom = Math.log2(14_186 / Math.max(km, 0.25));
  return Math.min(15.6, Math.max(9, zoom));
}
