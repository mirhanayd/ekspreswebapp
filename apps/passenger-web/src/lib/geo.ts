export type LngLat = { longitude: number; latitude: number };

/**
 * Location coordinates arrive either as GeoJSON (`{ type, coordinates }`) or as
 * the raw PostGIS EWKB hex string that the driver returns for geometry columns.
 * Both are normalised here so map components only deal with lng/lat pairs.
 */
export function toLngLat(value: unknown): LngLat | null {
  if (!value) return null;

  if (typeof value === 'object') {
    const coordinates = (value as { coordinates?: unknown }).coordinates;
    if (Array.isArray(coordinates) && coordinates.length >= 2) {
      const [longitude, latitude] = coordinates as number[];
      return Number.isFinite(longitude) && Number.isFinite(latitude)
        ? { longitude, latitude }
        : null;
    }
    return null;
  }

  if (typeof value === 'string') return parseEwkbPoint(value);
  return null;
}

function parseEwkbPoint(hex: string): LngLat | null {
  const clean = hex.trim();
  if (!/^[0-9a-fA-F]+$/.test(clean) || clean.length < 42) return null;

  const bytes = new Uint8Array(clean.length / 2);
  for (let index = 0; index < bytes.length; index += 1) {
    bytes[index] = Number.parseInt(clean.slice(index * 2, index * 2 + 2), 16);
  }

  const view = new DataView(bytes.buffer);
  const littleEndian = bytes[0] === 1;
  const type = view.getUint32(1, littleEndian);
  // Point geometries only; the high bit flags an embedded SRID.
  if ((type & 0xff) !== 1) return null;

  let offset = 5;
  if (type & 0x20000000) offset += 4;
  if (bytes.length < offset + 16) return null;

  const longitude = view.getFloat64(offset, littleEndian);
  const latitude = view.getFloat64(offset + 8, littleEndian);
  return Number.isFinite(longitude) && Number.isFinite(latitude) ? { longitude, latitude } : null;
}
