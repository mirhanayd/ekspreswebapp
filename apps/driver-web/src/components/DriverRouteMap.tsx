'use client';

import { useMemo, useState } from 'react';
import { Layer, Map, Marker, NavigationControl, Source } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import { toLngLat } from '@/lib/geo';

type MapStop = {
  id: string;
  name: string;
  coordinates: unknown;
};

type Coordinate = { longitude: number; latitude: number };

export default function DriverRouteMap({
  stops,
  vehicle,
}: {
  stops: MapStop[];
  vehicle: Coordinate | null;
}) {
  const [mapError, setMapError] = useState(false);
  const points = useMemo(
    () =>
      stops
        .map((stop) => {
          const position = toLngLat(stop.coordinates);
          return position ? { ...stop, ...position } : null;
        })
        .filter((stop): stop is NonNullable<typeof stop> => stop !== null),
    [stops],
  );

  const initialViewState = useMemo(() => {
    if (points.length < 2) {
      const first = points[0];
      return first
        ? { longitude: first.longitude, latitude: first.latitude, zoom: 10 }
        : { longitude: 41.94, latitude: 37.93, zoom: 8 };
    }

    const longitudes = points.map((point) => point.longitude);
    const latitudes = points.map((point) => point.latitude);
    return {
      bounds: [
        [Math.min(...longitudes), Math.min(...latitudes)],
        [Math.max(...longitudes), Math.max(...latitudes)],
      ] as [[number, number], [number, number]],
      fitBoundsOptions: { padding: 52, maxZoom: 11 },
    };
  }, [points]);

  const line = useMemo(
    () => ({
      type: 'Feature' as const,
      properties: {},
      geometry: {
        type: 'LineString' as const,
        coordinates: points.map((point) => [point.longitude, point.latitude]),
      },
    }),
    [points],
  );

  if (mapError || points.length === 0) {
    return (
      <div className="v2-map-fallback" role="status">
        <strong>Harita şu anda gösterilemiyor.</strong>
        <span>Durakların sıralı güzergâhı aşağıda kullanılabilir.</span>
        {mapError ? (
          <button type="button" onClick={() => setMapError(false)}>
            Haritayı tekrar dene
          </button>
        ) : null}
      </div>
    );
  }

  return (
    <div className="v2-map-inner" role="region" aria-label="Şoför güzergâh haritası">
      <Map
        initialViewState={initialViewState}
        mapStyle="https://basemaps.cartocdn.com/gl/positron-gl-style/style.json"
        style={{ width: '100%', height: '100%' }}
        attributionControl={false}
        onError={() => setMapError(true)}
      >
        <NavigationControl position="top-right" showCompass={false} />
        {points.length > 1 ? (
          <Source id="driver-route" type="geojson" data={line}>
            <Layer
              id="driver-route-casing"
              type="line"
              layout={{ 'line-cap': 'round', 'line-join': 'round' }}
              paint={{ 'line-color': '#ffffff', 'line-width': 9, 'line-opacity': 0.95 }}
            />
            <Layer
              id="driver-route-line"
              type="line"
              layout={{ 'line-cap': 'round', 'line-join': 'round' }}
              paint={{ 'line-color': '#F7AA12', 'line-width': 4 }}
            />
          </Source>
        ) : null}
        {points.map((point, index) => (
          <Marker key={point.id} longitude={point.longitude} latitude={point.latitude}>
            <span
              className="v2-map-marker"
              title={point.name}
              aria-label={String(index + 1) + '. durak: ' + point.name}
            >
              {index + 1}
            </span>
          </Marker>
        ))}
        {vehicle ? (
          <Marker longitude={vehicle.longitude} latitude={vehicle.latitude}>
            <span className="v2-map-vehicle" role="img" aria-label="Son gönderilen araç konumu">
              🚌
            </span>
          </Marker>
        ) : null}
      </Map>
      <a
        className="v2-map-attribution"
        href="https://www.openstreetmap.org/copyright"
        target="_blank"
        rel="noreferrer"
      >
        © OpenStreetMap · © CARTO
      </a>
    </div>
  );
}
