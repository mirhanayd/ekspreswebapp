'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { Crosshair, Minus, Plus } from 'lucide-react';
import { toLngLat } from '@/lib/geo';

export type RouteGeometry = {
  type: 'LineString';
  coordinates: Array<[number, number]>;
};

export type DriverMapStop = {
  id: string;
  stopOrder: number;
  location: { name: string; coordinates?: unknown };
};

export type DriverMapPosition = {
  longitude: number;
  latitude: number;
  speedKph: number;
  headingDeg: number;
  recordedAt: string;
};

const TURKEY_CENTER: [number, number] = [41.94, 37.93];
const TRAVELED = '#D9411A';
const REMAINING = '#5B6472';

/** Index of the route vertex closest to the vehicle; everything before it counts as travelled. */
function nearestVertex(coordinates: Array<[number, number]>, position: DriverMapPosition | null) {
  if (!position || coordinates.length < 2) return 0;
  let best = 0;
  let bestDistance = Number.POSITIVE_INFINITY;
  const cos = Math.cos((position.latitude * Math.PI) / 180);
  coordinates.forEach(([longitude, latitude], index) => {
    const dx = (longitude - position.longitude) * cos;
    const dy = latitude - position.latitude;
    const distance = dx * dx + dy * dy;
    if (distance < bestDistance) {
      bestDistance = distance;
      best = index;
    }
  });
  return best;
}

function splitRoute(coordinates: Array<[number, number]>, position: DriverMapPosition | null) {
  const index = nearestVertex(coordinates, position);
  const head = position ? ([position.longitude, position.latitude] as [number, number]) : null;
  const traveled = head && index > 0 ? [...coordinates.slice(0, index + 1), head] : [];
  return {
    traveled: {
      type: 'Feature' as const,
      properties: {},
      geometry: { type: 'LineString' as const, coordinates: traveled },
    },
  };
}

function mapStyle(): string | maplibregl.StyleSpecification {
  const custom = process.env.NEXT_PUBLIC_MAP_STYLE_URL;
  if (custom) return custom;
  const mapTilerKey = process.env.NEXT_PUBLIC_MAPTILER_KEY;
  if (mapTilerKey) {
    return {
      version: 8,
      sources: {
        'maptiler-raster': {
          type: 'raster',
          tiles: [
            `https://api.maptiler.com/maps/streets-v2-dark/256/{z}/{x}/{y}.png?key=${mapTilerKey}`,
          ],
          tileSize: 256,
          attribution: '© MapTiler © OpenStreetMap contributors',
        },
      },
      layers: [{ id: 'maptiler-raster', type: 'raster', source: 'maptiler-raster' }],
    };
  }
  return 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json';
}

export function DriverMap({
  geometry,
  stops,
  position,
  className = '',
}: {
  geometry: RouteGeometry | null;
  stops: DriverMapStop[];
  position: DriverMapPosition | null;
  className?: string;
}) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const vehicleMarker = useRef<maplibregl.Marker | null>(null);
  const vehicleMarkerContent = useRef<HTMLSpanElement | null>(null);
  const initialPosition = useRef(position);
  const latestPosition = useRef(position);
  const [mapReady, setMapReady] = useState(false);
  initialPosition.current = initialPosition.current ?? position;
  latestPosition.current = position;

  const computedStopPoints = stops.flatMap((stop) => {
    const point = toLngLat(stop.location.coordinates);
    return point ? [{ ...point, id: stop.id, name: stop.location.name }] : [];
  });
  const computedCoordinates =
    geometry && geometry.coordinates.length >= 2
      ? geometry.coordinates
      : computedStopPoints.map((point) => [point.longitude, point.latitude] as [number, number]);

  // Every trip refresh returns new objects; keying by content keeps the map from being torn down
  // and re-created after each passenger/status update or background refresh.
  const routeKey = JSON.stringify([computedCoordinates, computedStopPoints]);
  const stopPoints = useMemo(() => computedStopPoints, [routeKey]);
  const coordinates = useMemo(() => computedCoordinates, [routeKey]);

  const focusVehicle = useCallback(() => {
    if (!position) return;
    map.current?.flyTo({
      center: [position.longitude, position.latitude],
      zoom: 12,
      duration: 650,
    });
  }, [position]);

  useEffect(() => {
    if (!mapContainer.current) return;

    const initial = initialPosition.current
      ? [initialPosition.current.longitude, initialPosition.current.latitude]
      : coordinates[0] || TURKEY_CENTER;
    const instance = new maplibregl.Map({
      container: mapContainer.current,
      style: mapStyle(),
      center: initial as [number, number],
      zoom: coordinates.length > 1 ? 7 : 9,
      attributionControl: { compact: true },
    });
    map.current = instance;
    setMapReady(false);

    let overlaysAdded = false;
    const setupOverlays = () => {
      if (overlaysAdded) return;
      overlaysAdded = true;
      setMapReady(true);
      if (coordinates.length > 1) {
        instance.addSource('driver-route', {
          type: 'geojson',
          data: { type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates } },
        });
        instance.addLayer({
          id: 'driver-route-line',
          type: 'line',
          source: 'driver-route',
          layout: { 'line-cap': 'round', 'line-join': 'round' },
          paint: { 'line-color': REMAINING, 'line-width': 5 },
        });
        instance.addSource('driver-route-traveled', {
          type: 'geojson',
          data: splitRoute(coordinates, latestPosition.current).traveled,
        });
        instance.addLayer({
          id: 'driver-route-traveled',
          type: 'line',
          source: 'driver-route-traveled',
          layout: { 'line-cap': 'round', 'line-join': 'round' },
          paint: { 'line-color': TRAVELED, 'line-width': 6 },
        });

        const bounds = coordinates.reduce(
          (value, coordinate) => value.extend(coordinate),
          new maplibregl.LngLatBounds(coordinates[0], coordinates[0]),
        );
        instance.fitBounds(bounds, { padding: 48, maxZoom: 11, duration: 0 });
      }

      stopPoints.forEach((point, index) => {
        const marker = document.createElement('span');
        marker.className = `driver-map-stop ${index === 0 ? 'is-origin' : ''}`;
        marker.textContent = String(index + 1);
        marker.title = point.name;
        new maplibregl.Marker({ element: marker })
          .setLngLat([point.longitude, point.latitude])
          .addTo(instance);
      });

      const markerContent = document.createElement('span');
      markerContent.className = 'driver-map-vehicle';
      markerContent.setAttribute('aria-hidden', 'true');
      vehicleMarkerContent.current = markerContent;
      const start = latestPosition.current
        ? [latestPosition.current.longitude, latestPosition.current.latitude]
        : initial;
      vehicleMarker.current = new maplibregl.Marker({ element: markerContent })
        .setLngLat(start as [number, number])
        .addTo(instance);
    };

    instance.once('load', setupOverlays);
    instance.on('styledata', () => {
      if (instance.isStyleLoaded()) setupOverlays();
    });

    return () => {
      vehicleMarker.current?.remove();
      vehicleMarker.current = null;
      vehicleMarkerContent.current = null;
      instance.remove();
      map.current = null;
      setMapReady(false);
    };
  }, [coordinates, stopPoints]);

  useEffect(() => {
    if (!position) return;
    vehicleMarker.current?.setLngLat([position.longitude, position.latitude]);
    if (vehicleMarkerContent.current) {
      vehicleMarkerContent.current.style.setProperty('--heading', `${position.headingDeg}deg`);
    }
    const source = map.current?.getSource('driver-route-traveled') as
      maplibregl.GeoJSONSource | undefined;
    source?.setData(splitRoute(coordinates, position).traveled);
  }, [coordinates, position, mapReady]);

  return (
    <div className={`driver-map-viewport ${className}`}>
      <div ref={mapContainer} className="driver-map" role="img" aria-label="Sefer rota haritası" />
      {!mapReady ? <div className="driver-map-fallback" aria-hidden /> : null}
      <div className="driver-map-controls">
        <button
          type="button"
          onClick={() => map.current?.zoomIn({ duration: 250 })}
          aria-label="Haritayı yakınlaştır"
        >
          <Plus aria-hidden />
        </button>
        <button
          type="button"
          onClick={() => map.current?.zoomOut({ duration: 250 })}
          aria-label="Haritayı uzaklaştır"
        >
          <Minus aria-hidden />
        </button>
        <button
          type="button"
          onClick={focusVehicle}
          disabled={!position}
          aria-label="Otobüsü ortala"
        >
          <Crosshair aria-hidden />
        </button>
      </div>
    </div>
  );
}
