'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { io, Socket } from 'socket.io-client';
import {
  ArrowLeft,
  BusFront,
  Gauge,
  LocateFixed,
  MapPin,
  Ticket,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import Link from 'next/link';
import { toLngLat } from '@/lib/geo';
import { measureRoute, projectOnRoute } from '@/lib/route-progress';
import { formatTime, placeShortName } from '@/lib/format';

type TrackingPosition = {
  tripId: string;
  busId: string;
  longitude: number;
  latitude: number;
  speedKph: number;
  headingDeg: number;
  recordedAt: string;
  sequence: number;
  source: string;
};

type BootstrapStop = {
  id: string;
  stopOrder?: number;
  estimatedMinutesFromStart?: number;
  location?: { name?: string; coordinates?: unknown };
};

type Bootstrap = {
  ticketId: string;
  accessToken: string;
  routeGeometry: { type: 'LineString'; coordinates: Array<[number, number]> };
  latestPosition: TrackingPosition | null;
  trip: {
    id: string;
    departureTime: string;
    arrivalTime: string;
    status?: string;
    bus: { plateNumber: string; model?: string };
    route: {
      origin: { name: string };
      destination: { name: string };
      stops?: BootstrapStop[];
    };
  };
};

type TrackingState = 'connecting' | 'live' | 'delayed' | 'stale' | 'offline' | 'forbidden';

function stateFromAge(recordedAt: string | null, connected: boolean): TrackingState {
  if (!recordedAt) return connected ? 'connecting' : 'offline';
  const ageSeconds = (Date.now() - new Date(recordedAt).getTime()) / 1000;
  if (!connected && ageSeconds > 15) return 'offline';
  if (ageSeconds <= 15) return 'live';
  if (ageSeconds <= 60) return 'delayed';
  if (ageSeconds <= 180) return 'stale';
  return 'offline';
}

const stateLabels: Record<TrackingState, string> = {
  connecting: 'Canlı konum bekleniyor',
  live: 'Canlı takip aktif',
  delayed: 'Konum gecikmeli geliyor',
  stale: 'Son konum eski olabilir',
  offline: 'Araç bağlantısı yok',
  forbidden: 'Takip yetkisi sona erdi',
};

const stateTone: Record<TrackingState, string> = {
  connecting: 'bg-ember-500',
  live: 'bg-emerald-500',
  delayed: 'bg-ember-500',
  stale: 'bg-ember-600',
  offline: 'bg-brand-600',
  forbidden: 'bg-brand-600',
};

export default function LiveMapView({
  bootstrap,
  socketOrigin,
}: {
  bootstrap: Bootstrap;
  socketOrigin: string;
}) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const markerRef = useRef<maplibregl.Marker | null>(null);
  const markerIconRef = useRef<HTMLSpanElement | null>(null);
  const [position, setPosition] = useState<TrackingPosition | null>(bootstrap.latestPosition);
  const [connected, setConnected] = useState(false);
  const [trackingState, setTrackingState] = useState<TrackingState>(
    stateFromAge(bootstrap.latestPosition?.recordedAt || null, false),
  );

  const coordinates = bootstrap.routeGeometry.coordinates;
  const metrics = useMemo(() => measureRoute(coordinates), [coordinates]);

  /** Route stops projected onto the line, so "next stop" follows the vehicle. */
  const stops = useMemo(() => {
    const raw = bootstrap.trip.route.stops ?? [];
    return raw
      .map((stop) => {
        const point = toLngLat(stop.location?.coordinates);
        if (!point) return null;
        const projection = projectOnRoute(coordinates, metrics, point);
        return {
          id: stop.id,
          name: stop.location?.name ?? 'Durak',
          order: stop.stopOrder ?? 0,
          travelledKm: projection?.travelledKm ?? 0,
          longitude: point.longitude,
          latitude: point.latitude,
        };
      })
      .filter((stop): stop is NonNullable<typeof stop> => Boolean(stop))
      .sort((a, b) => a.travelledKm - b.travelledKm);
  }, [bootstrap.trip.route.stops, coordinates, metrics]);

  const projection = useMemo(
    () =>
      position
        ? projectOnRoute(coordinates, metrics, {
            longitude: position.longitude,
            latitude: position.latitude,
          })
        : null,
    [position, coordinates, metrics],
  );

  const progressPercent = Math.round((projection?.fraction ?? 0) * 100);
  const remainingKm = Math.max(0, metrics.totalKm - (projection?.travelledKm ?? 0));
  const nextStop = stops.find((stop) => stop.travelledKm > (projection?.travelledKm ?? 0) + 0.4);
  const nextStopKm = nextStop
    ? Math.max(0, nextStop.travelledKm - (projection?.travelledKm ?? 0))
    : null;
  const etaMinutes = Math.max(
    0,
    Math.round((new Date(bootstrap.trip.arrivalTime).getTime() - Date.now()) / 60000),
  );

  useEffect(() => {
    const interval = setInterval(() => {
      setTrackingState((current) =>
        current === 'forbidden' ? current : stateFromAge(position?.recordedAt || null, connected),
      );
    }, 5000);
    return () => clearInterval(interval);
  }, [connected, position?.recordedAt]);

  useEffect(() => {
    if (!mapContainer.current) return;
    const first = coordinates[0];
    const last = coordinates[coordinates.length - 1];
    const initial = bootstrap.latestPosition
      ? [bootstrap.latestPosition.longitude, bootstrap.latestPosition.latitude]
      : first;

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json',
      center: initial as [number, number],
      zoom: 8,
      attributionControl: false,
    });

    map.current.on('load', () => {
      const instance = map.current;
      if (!instance) return;

      instance.addSource('demo-route', {
        type: 'geojson',
        data: { type: 'Feature', properties: {}, geometry: bootstrap.routeGeometry },
      });
      instance.addLayer({
        id: 'demo-route-casing',
        type: 'line',
        source: 'demo-route',
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: { 'line-color': '#ffffff', 'line-width': 10, 'line-opacity': 0.9 },
      });
      instance.addLayer({
        id: 'demo-route-line',
        type: 'line',
        source: 'demo-route',
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: { 'line-color': '#CDC5BC', 'line-width': 5 },
      });
      instance.addSource('demo-route-travelled', {
        type: 'geojson',
        data: {
          type: 'Feature',
          properties: {},
          geometry: { type: 'LineString', coordinates: [] },
        },
      });
      instance.addLayer({
        id: 'demo-route-travelled-line',
        type: 'line',
        source: 'demo-route-travelled',
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: { 'line-color': '#A32619', 'line-width': 5 },
      });

      const bounds = coordinates.reduce(
        (value, coordinate) => value.extend(coordinate),
        new maplibregl.LngLatBounds(first, first),
      );
      instance.fitBounds(bounds, {
        padding: { top: 90, bottom: 260, left: 40, right: 40 },
        maxZoom: 10,
      });

      new maplibregl.Marker({ color: '#12100E' }).setLngLat(first).addTo(instance);
      new maplibregl.Marker({ color: '#A32619' }).setLngLat(last).addTo(instance);

      const markerElement = document.createElement('div');
      markerElement.className =
        'grid h-11 w-11 place-items-center rounded-full border-4 border-white bg-brand-700 shadow-lg';
      markerElement.innerHTML =
        '<span aria-hidden="true" style="font-size:18px;line-height:1;display:inline-block">🚌</span>';
      markerIconRef.current = markerElement.querySelector('span');
      markerRef.current = new maplibregl.Marker({ element: markerElement })
        .setLngLat(initial as [number, number])
        .addTo(instance);
    });

    socketRef.current = io(socketOrigin, {
      path: '/api/tracking',
      transports: ['websocket'],
      auth: { token: bootstrap.accessToken },
      reconnectionDelay: 1000,
      reconnectionDelayMax: 15000,
    });
    socketRef.current.on('tracking:ready', () => setConnected(true));
    socketRef.current.on('disconnect', () => setConnected(false));
    socketRef.current.on('connect_error', () => setConnected(false));
    socketRef.current.on('tracking:error', () => setTrackingState('forbidden'));
    socketRef.current.on('tracking:position', (next: TrackingPosition) => {
      if (next.tripId !== bootstrap.trip.id) return;
      setPosition(next);
      setTrackingState('live');
      markerRef.current?.setLngLat([next.longitude, next.latitude]);
      if (markerIconRef.current) {
        markerIconRef.current.style.transform = `rotate(${next.headingDeg}deg)`;
      }
    });

    return () => {
      socketRef.current?.disconnect();
      map.current?.remove();
      map.current = null;
    };
  }, [bootstrap, socketOrigin, coordinates]);

  /** Paint the covered part of the route as the vehicle advances. */
  useEffect(() => {
    const instance = map.current;
    if (!instance || !projection || !position) return;
    const source = instance.getSource('demo-route-travelled') as
      maplibregl.GeoJSONSource | undefined;
    if (!source) return;
    source.setData({
      type: 'Feature',
      properties: {},
      geometry: {
        type: 'LineString',
        coordinates: [
          ...coordinates.slice(0, projection.index + 1),
          [position.longitude, position.latitude],
        ],
      },
    });
  }, [projection, position, coordinates]);

  const focusStop = (stop: { longitude: number; latitude: number }) => {
    map.current?.flyTo({ center: [stop.longitude, stop.latitude], zoom: 10.5, duration: 700 });
  };

  return (
    <div className="relative h-full w-full">
      <div
        ref={mapContainer}
        className="absolute inset-0"
        role="region"
        aria-label="Canlı sefer haritası"
      />

      {/* Floating top bar */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-start justify-between gap-3 p-3 sm:p-4">
        <Link
          href={`/tickets/${bootstrap.ticketId}`}
          aria-label="Bilete dön"
          className="icon-btn icon-btn-light pointer-events-auto"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
        </Link>

        <div className="pointer-events-auto min-w-0 flex-1 rounded-full border border-ink-200/70 bg-white/95 px-4 py-2 text-center shadow-lift backdrop-blur sm:max-w-md">
          <h1 className="flex items-center justify-center gap-1.5 truncate font-display text-sm font-bold text-ink-900">
            <BusFront className="h-4 w-4 shrink-0 text-brand-700" aria-hidden />
            <span className="truncate">
              {placeShortName(bootstrap.trip.route.origin.name)} –{' '}
              {placeShortName(bootstrap.trip.route.destination.name)}
            </span>
          </h1>
          <p className="mt-0.5 flex items-center justify-center gap-1.5 text-2xs font-bold text-ink-600">
            <span
              className={`h-2 w-2 shrink-0 rounded-full ${stateTone[trackingState]} ${
                trackingState === 'live' ? 'animate-pulse-ring' : ''
              }`}
              aria-hidden
            />
            <span className="truncate">{stateLabels[trackingState]}</span>
          </p>
        </div>

        <Link
          href={`/tickets/${bootstrap.ticketId}`}
          aria-label="Bilet özetini aç"
          className="icon-btn icon-btn-light pointer-events-auto"
        >
          <Ticket className="h-4 w-4" aria-hidden />
        </Link>
      </div>

      {/* Stop tabs down the left edge */}
      {stops.length ? (
        <ul className="absolute left-3 top-1/2 z-10 flex -translate-y-1/2 flex-col gap-2.5 sm:left-4">
          {stops.map((stop, index) => {
            const isNext = nextStop?.id === stop.id;
            const passed = stop.travelledKm <= (projection?.travelledKm ?? 0);
            return (
              <li key={stop.id}>
                <button
                  type="button"
                  onClick={() => focusStop(stop)}
                  aria-label={`${index + 1}. durak: ${stop.name}`}
                  title={stop.name}
                  className={`stop-tab ${isNext ? 'stop-tab-active' : ''} ${
                    passed && !isNext ? 'opacity-60' : ''
                  }`}
                >
                  {index + 1}
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}

      {/* Map controls down the right edge */}
      <div className="absolute right-3 top-1/2 z-10 flex -translate-y-1/2 flex-col gap-3 sm:right-4">
        <button
          type="button"
          onClick={() => map.current?.zoomIn({ duration: 300 })}
          aria-label="Haritayı yakınlaştır"
          className="map-fab"
        >
          <ZoomIn className="h-4 w-4" aria-hidden />
        </button>
        <button
          type="button"
          onClick={() => map.current?.zoomOut({ duration: 300 })}
          aria-label="Haritayı uzaklaştır"
          className="map-fab"
        >
          <ZoomOut className="h-4 w-4" aria-hidden />
        </button>
        <button
          type="button"
          onClick={() => {
            if (!position) return;
            map.current?.flyTo({
              center: [position.longitude, position.latitude],
              zoom: 11,
              duration: 700,
            });
          }}
          disabled={!position}
          aria-label="Aracı ortala"
          className="map-fab"
        >
          <LocateFixed className="h-4 w-4" aria-hidden />
        </button>
      </div>

      {/* Floating journey panel */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 space-y-2.5 p-3 sm:p-4">
        <section
          aria-label="Sefer durumu"
          className="panel pointer-events-auto mx-auto max-w-3xl p-4 sm:p-5"
        >
          {/* Times + ETA pill */}
          <div className="relative flex items-center justify-between gap-3">
            <p className="num text-sm font-semibold text-ink-300">
              {formatTime(bootstrap.trip.departureTime)}
            </p>
            <span className="duration-pill shrink-0">
              {etaMinutes > 0 ? `~${etaMinutes} dk` : 'Yaklaşıyor'}
            </span>
            <p className="num text-sm font-semibold text-ink-300">
              {formatTime(bootstrap.trip.arrivalTime)}
            </p>
          </div>

          {/* Endpoints */}
          <div className="mt-1.5 flex items-baseline justify-between gap-3">
            <p className="min-w-0 truncate font-display text-lg font-extrabold">
              {placeShortName(bootstrap.trip.route.origin.name)}
            </p>
            <p className="min-w-0 truncate text-right font-display text-lg font-extrabold">
              {placeShortName(bootstrap.trip.route.destination.name)}
            </p>
          </div>

          {/* Dotted progress track */}
          <div
            className="relative mt-3 flex items-center"
            role="progressbar"
            aria-valuenow={progressPercent}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Yolculuk ilerlemesi"
          >
            <span className="h-3 w-3 shrink-0 rounded-full bg-ember-400" />
            <span className="relative mx-1 h-0.5 flex-1">
              <span className="absolute inset-0 border-t-2 border-dashed border-ember-400/45" />
              <span
                className="absolute inset-y-0 left-0 border-t-2 border-ember-400 transition-[width] duration-700"
                style={{ width: `${progressPercent}%` }}
              />
              <span
                className="absolute top-1/2 grid h-6 w-6 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border-2 border-ink-950 bg-ember-400 text-ink-950 transition-[left] duration-700"
                style={{ left: `${progressPercent}%` }}
              >
                <BusFront className="h-3 w-3" aria-hidden />
              </span>
            </span>
            <span className="h-3 w-3 shrink-0 rounded-full bg-white" />
          </div>

          <p className="mt-2.5 text-center text-2xs font-semibold text-ink-400">
            %{progressPercent} tamamlandı
            {metrics.totalKm > 0 ? ` · yaklaşık ${remainingKm.toFixed(0)} km kaldı` : ''}
            {position ? ` · son güncelleme ${formatTime(position.recordedAt)}` : ''}
          </p>
        </section>

        {/* Status pills */}
        <ul className="hide-scrollbar pointer-events-auto mx-auto flex max-w-3xl gap-2.5 overflow-x-auto">
          <li className="min-w-0 max-w-[62%] shrink-0">
            <span className="flex min-h-12 items-center gap-2 rounded-full bg-ink-950/95 px-4 text-sm font-bold text-white shadow-panel backdrop-blur">
              <MapPin className="h-4 w-4 shrink-0 text-ember-300" aria-hidden />
              <span className="truncate">
                {nextStop ? nextStop.name : bootstrap.trip.route.destination.name}
              </span>
              {nextStopKm !== null ? (
                <span className="num shrink-0 text-ember-300">{nextStopKm.toFixed(0)} km</span>
              ) : null}
            </span>
          </li>
          <li>
            <span className="flex min-h-12 items-center gap-2 whitespace-nowrap rounded-full bg-ink-950/95 px-4 text-sm font-bold text-white shadow-panel backdrop-blur">
              <BusFront className="h-4 w-4 shrink-0 text-ink-400" aria-hidden />
              {bootstrap.trip.bus.plateNumber}
            </span>
          </li>
          <li>
            <span className="flex min-h-12 items-center gap-2 whitespace-nowrap rounded-full bg-ink-950/95 px-4 text-sm font-bold text-white shadow-panel backdrop-blur">
              <Gauge className="h-4 w-4 shrink-0 text-ink-400" aria-hidden />
              {Math.round(position?.speedKph || 0)} km/sa
            </span>
          </li>
        </ul>
      </div>
    </div>
  );
}
