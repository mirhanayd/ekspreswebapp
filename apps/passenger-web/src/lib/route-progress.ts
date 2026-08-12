export type Point = { longitude: number; latitude: number };

const EARTH_RADIUS_KM = 6371;
const toRadians = (value: number) => (value * Math.PI) / 180;

/** Equirectangular approximation — accurate enough at intercity scale. */
export function distanceKm(a: Point, b: Point): number {
  const meanLatitude = toRadians((a.latitude + b.latitude) / 2);
  const x = toRadians(b.longitude - a.longitude) * Math.cos(meanLatitude);
  const y = toRadians(b.latitude - a.latitude);
  return Math.sqrt(x * x + y * y) * EARTH_RADIUS_KM;
}

export type RouteMetrics = {
  /** Cumulative distance in km at each vertex. */
  cumulative: number[];
  totalKm: number;
};

export function measureRoute(coordinates: Array<[number, number]>): RouteMetrics {
  const cumulative = [0];
  for (let index = 1; index < coordinates.length; index += 1) {
    const previous = coordinates[index - 1];
    const current = coordinates[index];
    cumulative.push(
      cumulative[index - 1] +
        distanceKm(
          { longitude: previous[0], latitude: previous[1] },
          { longitude: current[0], latitude: current[1] },
        ),
    );
  }
  return { cumulative, totalKm: cumulative[cumulative.length - 1] || 0 };
}

export type Projection = {
  /** Index of the vertex that starts the closest segment. */
  index: number;
  /** Distance travelled along the route in km. */
  travelledKm: number;
  /** 0–1 share of the route completed. */
  fraction: number;
};

/**
 * Projects a point onto the polyline and returns how far along the route it is.
 * Used for the live progress bar, the travelled overlay and next-stop lookups.
 */
export function projectOnRoute(
  coordinates: Array<[number, number]>,
  metrics: RouteMetrics,
  point: Point,
): Projection | null {
  if (coordinates.length < 2) return null;

  let best: Projection | null = null;
  let bestDistance = Number.POSITIVE_INFINITY;

  for (let index = 0; index < coordinates.length - 1; index += 1) {
    const start = { longitude: coordinates[index][0], latitude: coordinates[index][1] };
    const end = { longitude: coordinates[index + 1][0], latitude: coordinates[index + 1][1] };

    const segmentX = end.longitude - start.longitude;
    const segmentY = end.latitude - start.latitude;
    const lengthSquared = segmentX * segmentX + segmentY * segmentY;
    const t =
      lengthSquared === 0
        ? 0
        : Math.max(
            0,
            Math.min(
              1,
              ((point.longitude - start.longitude) * segmentX +
                (point.latitude - start.latitude) * segmentY) /
                lengthSquared,
            ),
          );

    const closest = {
      longitude: start.longitude + t * segmentX,
      latitude: start.latitude + t * segmentY,
    };
    const gap = distanceKm(point, closest);
    if (gap < bestDistance) {
      bestDistance = gap;
      const travelledKm = metrics.cumulative[index] + distanceKm(start, closest);
      best = {
        index,
        travelledKm,
        fraction: metrics.totalKm ? Math.min(1, travelledKm / metrics.totalKm) : 0,
      };
    }
  }

  return best;
}
