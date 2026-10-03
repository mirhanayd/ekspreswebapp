'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
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

export function DriverMap({
  geometry,
  stops,
  position,
  sharing,
}: {
  geometry: RouteGeometry | null;
  stops: DriverMapStop[];
  position: DriverMapPosition | null;
  sharing: boolean;
}) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const vehicleMarker = useRef<maplibregl.Marker | null>(null);
  const vehicleMarkerContent = useRef<HTMLSpanElement | null>(null);
  const initialPosition = useRef(position);
  const [mapReady, setMapReady] = useState(false);
  initialPosition.current = position;

  const stopPoints = useMemo(
    () =>
      stops.flatMap((stop) => {
        const point = toLngLat(stop.location.coordinates);
        return point ? [{ ...point, id: stop.id, name: stop.location.name }] : [];
      }),
    [stops],
  );

  const coordinates = useMemo(() => {
    if (geometry && geometry.coordinates.length >= 2) return geometry.coordinates;
    return stopPoints.map((point) => [point.longitude, point.latitude] as [number, number]);
  }, [geometry, stopPoints]);

  const focusVehicle = useCallback(() => {
    if (!position) return;
    map.current?.flyTo({
      center: [position.longitude, position.latitude],
      zoom: 11,
      duration: 650,
    });
  }, [position]);

  const routePreview = useMemo(() => {
    const source = coordinates.length ? coordinates : [TURKEY_CENTER];
    const longitudes = source.map(([longitude]) => longitude);
    const latitudes = source.map(([, latitude]) => latitude);
    const minLongitude = Math.min(...longitudes);
    const maxLongitude = Math.max(...longitudes);
    const minLatitude = Math.min(...latitudes);
    const maxLatitude = Math.max(...latitudes);
    const longitudeSpan = Math.max(0.001, maxLongitude - minLongitude);
    const latitudeSpan = Math.max(0.001, maxLatitude - minLatitude);
    const project = ([longitude, latitude]: [number, number]) =>
      `${10 + ((longitude - minLongitude) / longitudeSpan) * 80},${90 - ((latitude - minLatitude) / latitudeSpan) * 80}`;
    return {
      line: source.map(project).join(' '),
      vehicle: position ? project([position.longitude, position.latitude]) : null,
    };
  }, [coordinates, position]);

  useEffect(() => {
    if (!mapContainer.current) return;

    const initial = initialPosition.current
      ? [initialPosition.current.longitude, initialPosition.current.latitude]
      : coordinates[0] || TURKEY_CENTER;
    const instance = new maplibregl.Map({
      container: mapContainer.current,
      style: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json',
      center: initial as [number, number],
      zoom: coordinates.length > 1 ? 7 : 9,
      attributionControl: false,
    });
    map.current = instance;
    setMapReady(false);

    instance.on('load', () => {
      setMapReady(true);
      if (coordinates.length > 1) {
        instance.addSource('driver-route', {
          type: 'geojson',
          data: {
            type: 'Feature',
            properties: {},
            geometry: { type: 'LineString', coordinates },
          },
        });
        instance.addLayer({
          id: 'driver-route-casing',
          type: 'line',
          source: 'driver-route',
          layout: { 'line-cap': 'round', 'line-join': 'round' },
          paint: { 'line-color': '#ffffff', 'line-width': 10, 'line-opacity': 0.95 },
        });
        instance.addLayer({
          id: 'driver-route-line',
          type: 'line',
          source: 'driver-route',
          layout: { 'line-cap': 'round', 'line-join': 'round' },
          paint: { 'line-color': '#F7AA12', 'line-width': 4 },
        });

        const bounds = coordinates.reduce(
          (value, coordinate) => value.extend(coordinate),
          new maplibregl.LngLatBounds(coordinates[0], coordinates[0]),
        );
        instance.fitBounds(bounds, {
          padding: { top: 56, bottom: 56, left: 56, right: 56 },
          maxZoom: 10,
        });
      }

      stopPoints.forEach((point, index) => {
        const marker = document.createElement('span');
        marker.className = `driver-map-stop ${index === 0 ? 'driver-map-stop-origin' : ''}`;
        marker.textContent = String(index + 1);
        marker.title = point.name;
        new maplibregl.Marker({ element: marker })
          .setLngLat([point.longitude, point.latitude])
          .addTo(instance);
      });

      if (coordinates[0]) {
        new maplibregl.Marker({ color: '#09200F' }).setLngLat(coordinates[0]).addTo(instance);
      }
      if (coordinates.length > 1) {
        new maplibregl.Marker({ color: '#C95645' })
          .setLngLat(coordinates[coordinates.length - 1])
          .addTo(instance);
      }

      const markerContent = document.createElement('span');
      markerContent.className = 'driver-map-vehicle-mark';
      markerContent.textContent = 'SKE';
      vehicleMarkerContent.current = markerContent;
      vehicleMarker.current = new maplibregl.Marker({ element: markerContent })
        .setLngLat(initial as [number, number])
        .addTo(instance);
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
      vehicleMarkerContent.current.style.transform = `rotate(${position.headingDeg}deg)`;
    }
  }, [position]);

  const updatedAt = position
    ? new Intl.DateTimeFormat('tr-TR', { hour: '2-digit', minute: '2-digit' }).format(
        new Date(position.recordedAt),
      )
    : null;

  return (
    <section className="driver-map-card" aria-label="Sefer haritası">
      <div className="driver-map-heading">
        <div>
          <p className="eyebrow">CANLI ROTA</p>
          <h3>Otobüs nerede?</h3>
        </div>
        <span className={`map-state ${sharing ? 'map-state-live' : ''}`}>
          <i aria-hidden />
          {sharing ? 'GPS açık' : position ? `Son konum ${updatedAt}` : 'GPS bekleniyor'}
        </span>
      </div>

      <div className="driver-map-viewport">
        <div
          ref={mapContainer}
          className="driver-map"
          role="img"
          aria-label="Sefer rota haritası"
        />
        {!mapReady ? (
          <div className="driver-map-fallback" aria-hidden="true">
            <svg viewBox="0 0 100 100" preserveAspectRatio="none">
              <polyline points={routePreview.line} />
              {routePreview.vehicle ? (
                <circle
                  cx={routePreview.vehicle.split(',')[0]}
                  cy={routePreview.vehicle.split(',')[1]}
                  r="3.5"
                />
              ) : null}
            </svg>
            <span>Rota hazırlanıyor</span>
          </div>
        ) : null}
        <div className="driver-map-controls" aria-label="Harita kontrolleri">
          <button
            type="button"
            onClick={() => map.current?.zoomIn({ duration: 250 })}
            aria-label="Haritayı yakınlaştır"
          >
            +
          </button>
          <button
            type="button"
            onClick={() => map.current?.zoomOut({ duration: 250 })}
            aria-label="Haritayı uzaklaştır"
          >
            −
          </button>
          <button
            type="button"
            onClick={focusVehicle}
            disabled={!position}
            aria-label="Otobüsü ortala"
          >
            ◎
          </button>
        </div>
        <div className="driver-map-caption">
          <span>
            <i className="legend-route" aria-hidden /> Rota
          </span>
          <span>
            <i className="legend-vehicle" aria-hidden /> Son GPS
          </span>
        </div>
      </div>
    </section>
  );
}
