'use client';

import { useMemo } from 'react';
import { BusFront } from 'lucide-react';
import { Layer, Map, Marker, NavigationControl, Source } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';

export type RouteStopPoint = {
  id: string;
  name: string;
  longitude: number;
  latitude: number;
};

const TURKEY_CENTER = { longitude: 41.94, latitude: 37.93, zoom: 6.5 };

export default function MapView({
  points,
  vehicle,
  onError,
}: {
  points: RouteStopPoint[];
  vehicle?: { longitude: number; latitude: number; label: string };
  onError?: () => void;
}) {
  const initialViewState = useMemo(() => {
    if (points.length < 2) {
      const single = points[0];
      return single
        ? { longitude: single.longitude, latitude: single.latitude, zoom: 9 }
        : TURKEY_CENTER;
    }
    const longitudes = points.map((point) => point.longitude);
    const latitudes = points.map((point) => point.latitude);
    return {
      bounds: [
        [Math.min(...longitudes), Math.min(...latitudes)],
        [Math.max(...longitudes), Math.max(...latitudes)],
      ] as [[number, number], [number, number]],
      fitBoundsOptions: { padding: 56, maxZoom: 11 },
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

  return (
    <Map
      initialViewState={initialViewState}
      mapStyle="https://basemaps.cartocdn.com/gl/positron-gl-style/style.json"
      attributionControl={false}
      style={{ width: '100%', height: '100%' }}
      onError={onError}
    >
      <NavigationControl position="top-right" showCompass={false} />

      {points.length > 1 ? (
        <Source id="trip-route" type="geojson" data={line}>
          <Layer
            id="trip-route-casing"
            type="line"
            layout={{ 'line-cap': 'round', 'line-join': 'round' }}
            paint={{ 'line-color': '#ffffff', 'line-width': 9, 'line-opacity': 0.95 }}
          />
          <Layer
            id="trip-route-line"
            type="line"
            layout={{ 'line-cap': 'round', 'line-join': 'round' }}
            paint={{ 'line-color': '#F7AA12', 'line-width': 4 }}
          />
        </Source>
      ) : null}

      {points.map((point, index) => {
        const isEdge = index === 0 || index === points.length - 1;
        return (
          <Marker key={point.id} longitude={point.longitude} latitude={point.latitude}>
            <span
              title={point.name}
              className={`grid place-items-center rounded-full border-2 border-white text-[0.625rem] font-bold shadow-lg ${
                isEdge ? 'h-7 w-7 bg-ink-900 text-white' : 'h-5 w-5 bg-amber-400 text-ink-900'
              }`}
            >
              {index + 1}
            </span>
          </Marker>
        );
      })}
      {vehicle ? (
        <Marker longitude={vehicle.longitude} latitude={vehicle.latitude}>
          <span
            title={vehicle.label}
            aria-label={vehicle.label}
            className="grid h-11 w-11 place-items-center rounded-full border-[3px] border-white bg-signal-500 text-white shadow-float"
          >
            <BusFront className="h-5 w-5" aria-hidden />
          </span>
        </Marker>
      ) : null}
    </Map>
  );
}
