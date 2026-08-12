/**
 * Matching a device position to a terminal we actually serve.
 *
 * The locations endpoint returns names, not coordinates, so the served
 * settlements are listed here with their centres. The device position is only
 * ever used in the browser to pick the closest of these — it is never sent
 * anywhere.
 */
const settlements: Array<{ match: string; latitude: number; longitude: number }> = [
  { match: 'siirt', latitude: 37.9333, longitude: 41.9333 },
  { match: 'kurtalan', latitude: 37.9214, longitude: 41.6939 },
  { match: 'batman', latitude: 37.8812, longitude: 41.1351 },
  { match: 'bismil', latitude: 37.8481, longitude: 40.6689 },
  { match: 'diyarbakır', latitude: 37.9144, longitude: 40.2306 },
  { match: 'diyarbakir', latitude: 37.9144, longitude: 40.2306 },
];

function distanceKm(
  a: { latitude: number; longitude: number },
  b: { latitude: number; longitude: number },
) {
  const toRad = (value: number) => (value * Math.PI) / 180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);
  const h = Math.sin(dLat / 2) ** 2 + Math.sin(dLon / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}

/**
 * The location whose settlement centre is closest to `position`, or null when
 * none of the served settlements is recognisable in the list.
 */
export function nearestLocation<T extends { id: string; name: string }>(
  locations: T[],
  position: { latitude: number; longitude: number },
): T | null {
  let best: { location: T; km: number } | null = null;

  for (const location of locations) {
    const key = location.name.toLocaleLowerCase('tr');
    const settlement = settlements.find((item) => key.includes(item.match));
    if (!settlement) continue;

    const km = distanceKm(position, settlement);
    if (!best || km < best.km) best = { location, km };
  }

  return best?.location ?? null;
}
