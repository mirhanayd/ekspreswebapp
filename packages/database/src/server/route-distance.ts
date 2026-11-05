export type LngLat = [number, number];

const EARTH_RADIUS_M = 6_371_008.8;
const toRadians = (value: number) => (value * Math.PI) / 180;

/** Equirectangular distance in metres; accurate well below 1 m at intercity segment sizes. */
export function distanceMeters(a: LngLat, b: LngLat) {
  const meanLatitude = toRadians((a[1] + b[1]) / 2);
  const x = toRadians(b[0] - a[0]) * Math.cos(meanLatitude);
  const y = toRadians(b[1] - a[1]);
  return Math.sqrt(x * x + y * y) * EARTH_RADIUS_M;
}

/**
 * Distance travelled along the polyline, in metres, to the closest point of the
 * line for `point`. Segments are projected in a local flat plane.
 */
export function alongLineMeters(line: readonly LngLat[], point: LngLat) {
  if (line.length < 2) return 0;
  let travelled = 0;
  let bestAlong = 0;
  let bestGap = Number.POSITIVE_INFINITY;

  for (let index = 0; index < line.length - 1; index += 1) {
    const start = line[index];
    const end = line[index + 1];
    const segmentLength = distanceMeters(start, end);
    const cosLatitude = Math.cos(toRadians((start[1] + end[1]) / 2));
    const dx = (end[0] - start[0]) * cosLatitude;
    const dy = end[1] - start[1];
    const lengthSquared = dx * dx + dy * dy;
    const t =
      lengthSquared === 0
        ? 0
        : Math.max(
            0,
            Math.min(
              1,
              ((point[0] - start[0]) * cosLatitude * dx + (point[1] - start[1]) * dy) /
                lengthSquared,
            ),
          );
    const closest: LngLat = [
      start[0] + (end[0] - start[0]) * t,
      start[1] + (end[1] - start[1]) * t,
    ];
    const gap = distanceMeters(point, closest);
    if (gap < bestGap) {
      bestGap = gap;
      bestAlong = travelled + segmentLength * t;
    }
    travelled += segmentLength;
  }
  return bestAlong;
}

/**
 * Remaining road distance from the bus to a stop, following the route line.
 * A bus that has already passed the stop reports 0.
 */
export function remainingRoadMeters(line: readonly LngLat[], bus: LngLat, stop: LngLat) {
  return Math.max(0, alongLineMeters(line, stop) - alongLineMeters(line, bus));
}
