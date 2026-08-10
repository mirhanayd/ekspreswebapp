export type Coordinate = [longitude: number, latitude: number];

function toRadians(value: number) {
  return (value * Math.PI) / 180;
}

function segmentDistance([longitudeA, latitudeA]: Coordinate, [longitudeB, latitudeB]: Coordinate) {
  const earthRadiusKm = 6371;
  const latitudeDelta = toRadians(latitudeB - latitudeA);
  const longitudeDelta = toRadians(longitudeB - longitudeA);
  const a =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(toRadians(latitudeA)) *
      Math.cos(toRadians(latitudeB)) *
      Math.sin(longitudeDelta / 2) ** 2;
  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function pointAtProgress(coordinates: Coordinate[], progress: number): Coordinate {
  if (coordinates.length < 2) throw new Error('Route requires at least two coordinates.');
  const clampedProgress = Math.max(0, Math.min(1, progress));
  const lengths = coordinates
    .slice(1)
    .map((coordinate, index) => segmentDistance(coordinates[index], coordinate));
  const totalLength = lengths.reduce((sum, length) => sum + length, 0);
  let remaining = totalLength * clampedProgress;

  for (let index = 0; index < lengths.length; index++) {
    const length = lengths[index];
    if (remaining <= length || index === lengths.length - 1) {
      const ratio = length === 0 ? 0 : remaining / length;
      const start = coordinates[index];
      const end = coordinates[index + 1];
      return [start[0] + (end[0] - start[0]) * ratio, start[1] + (end[1] - start[1]) * ratio];
    }
    remaining -= length;
  }
  return coordinates[coordinates.length - 1];
}

export function headingBetween(
  [longitudeA, latitudeA]: Coordinate,
  [longitudeB, latitudeB]: Coordinate,
) {
  const longitudeDelta = toRadians(longitudeB - longitudeA);
  const latitudeARadians = toRadians(latitudeA);
  const latitudeBRadians = toRadians(latitudeB);
  const y = Math.sin(longitudeDelta) * Math.cos(latitudeBRadians);
  const x =
    Math.cos(latitudeARadians) * Math.sin(latitudeBRadians) -
    Math.sin(latitudeARadians) * Math.cos(latitudeBRadians) * Math.cos(longitudeDelta);
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}
