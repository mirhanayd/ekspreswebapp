import type { LngLat } from './geo';

export type Coordinates = Array<[number, number]>;

const EARTH_RADIUS_KM = 6371;
const toRadians = (value: number) => (value * Math.PI) / 180;

/** Equirectangular approximation, accurate enough at intercity scale. */
export function distanceKm(a: LngLat, b: LngLat) {
  const meanLatitude = toRadians((a.latitude + b.latitude) / 2);
  const x = toRadians(b.longitude - a.longitude) * Math.cos(meanLatitude);
  const y = toRadians(b.latitude - a.latitude);
  return Math.sqrt(x * x + y * y) * EARTH_RADIUS_KM;
}

export function measureRoute(coordinates: Coordinates) {
  const cumulative = [0];
  for (let index = 1; index < coordinates.length; index += 1) {
    const [x1, y1] = coordinates[index - 1];
    const [x2, y2] = coordinates[index];
    cumulative.push(
      cumulative[index - 1] +
        distanceKm({ longitude: x1, latitude: y1 }, { longitude: x2, latitude: y2 }),
    );
  }
  return cumulative;
}

/** The closest point of the line to `point`: distance along the route and the segment it is on. */
export function projectOnRoute(coordinates: Coordinates, cumulative: number[], point: LngLat) {
  let best = { index: 0, km: 0, gap: Number.POSITIVE_INFINITY };
  for (let index = 0; index < coordinates.length - 1; index += 1) {
    const [x1, y1] = coordinates[index];
    const [x2, y2] = coordinates[index + 1];
    const dx = x2 - x1;
    const dy = y2 - y1;
    const lengthSquared = dx * dx + dy * dy;
    const t = lengthSquared
      ? Math.max(
          0,
          Math.min(1, ((point.longitude - x1) * dx + (point.latitude - y1) * dy) / lengthSquared),
        )
      : 0;
    const closest = { longitude: x1 + t * dx, latitude: y1 + t * dy };
    const gap = distanceKm(point, closest);
    if (gap < best.gap) {
      best = {
        index,
        gap,
        km: cumulative[index] + (cumulative[index + 1] - cumulative[index]) * t,
      };
    }
  }
  return best;
}

/** Route coordinates split at the bus into the part behind it and the part ahead. */
export function splitAtPosition(coordinates: Coordinates, cumulative: number[], point: LngLat) {
  const { index } = projectOnRoute(coordinates, cumulative, point);
  const head: [number, number] = [point.longitude, point.latitude];
  return {
    done: [...coordinates.slice(0, index + 1), head],
    todo: [head, ...coordinates.slice(index + 1)],
  };
}
