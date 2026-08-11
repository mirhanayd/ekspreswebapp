'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { io, Socket } from 'socket.io-client';
import { ArrowLeft, BusFront, Clock3, Gauge, MapPin, Ticket } from 'lucide-react';
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
    map.current.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');

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

      {/* Floating journey panel */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 p-3 sm:p-4">
        <section
          aria-label="Sefer durumu"
          className="panel pointer-events-auto mx-auto max-w-3xl p-4 sm:p-5"
        >
          {/* Times + duration pill */}
          <div className="relative flex items-end justify-between gap-3">
            <div className="min-w-0">
              <p className="num font-display text-2xl font-extrabold leading-none">
                {formatTime(bootstrap.trip.departureTime)}
              </p>
              <p className="mt-1 truncate text-2xs font-semibold text-ink-400">
                {placeShortName(bootstrap.trip.route.origin.name)} · kalkış
              </p>
            </div>
            <span className="duration-pill mb-1 shrink-0">
              <Clock3 className="h-3 w-3" aria-hidden />
              {etaMinutes > 0 ? `~${etaMinutes} dk` : 'Yaklaşıyor'}
            </span>
            <div className="min-w-0 text-right">
              <p className="num font-display text-2xl font-extrabold leading-none">
                {formatTime(bootstrap.trip.arrivalTime)}
              </p>
              <p className="mt-1 truncate text-2xs font-semibold text-ink-400">
                {placeShortName(bootstrap.trip.route.destination.name)} · varış
              </p>
            </div>
          </div>

          {/* Dotted progress track */}
          <div
            className="relative mt-4 flex items-center"
            role="progressbar"
            aria-valuenow={progressPercent}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Yolculuk ilerlemesi"
          >
            <span className="h-3 w-3 shrink-0 rounded-full bg-ember-400" />
            <span className="relative mx-1 h-0.5 flex-1">
              <span className="absolute inset-0 border-t-2 border-dotted border-white/35" />
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
            <span className="h-3 w-3 shrink-0 rounded-full border-2 border-white/60" />
          </div>

          <p className="mt-2.5 text-center text-2xs font-semibold text-ink-400">
            %{progressPercent} tamamlandı
            {metrics.totalKm > 0 ? ` · yaklaşık ${remainingKm.toFixed(0)} km kaldı` : ''}
            {position ? ` · son güncelleme ${formatTime(position.recordedAt)}` : ''}
          </p>

          {/* Next stop + live metrics */}
          <div className="mt-4 flex items-center gap-3 rounded-2xl bg-white/10 p-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brand-700 text-white">
              <MapPin className="h-4 w-4" aria-hidden />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-2xs font-bold uppercase tracking-wide text-ink-400">
                Sonraki durak
              </p>
              <p className="truncate font-display text-sm font-bold text-white">
                {nextStop ? nextStop.name : bootstrap.trip.route.destination.name}
              </p>
            </div>
            {nextStopKm !== null ? (
              <p className="num shrink-0 text-sm font-bold text-ember-300">
                {nextStopKm.toFixed(0)} km
              </p>
            ) : null}
          </div>

          <dl className="mt-3 grid grid-cols-2 gap-2">
            <Metric icon={<BusFront aria-hidden />} label="Araç">
              <p className="num truncate text-sm font-bold text-white">
                {bootstrap.trip.bus.plateNumber}
              </p>
            </Metric>
            <Metric icon={<Gauge aria-hidden />} label="Anlık hız">
              <p className="num text-sm font-bold text-white">
                {Math.round(position?.speedKph || 0)} km/sa
              </p>
            </Metric>
          </dl>
        </section>
      </div>
    </div>
  );
}

function Metric({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-w-0 rounded-2xl border border-white/15 p-2.5">
      <dt className="flex items-center gap-1.5 text-2xs font-bold uppercase tracking-wide text-ink-400">
        <span className="[&>svg]:h-3 [&>svg]:w-3">{icon}</span>
        <span className="truncate">{label}</span>
      </dt>
      <dd className="mt-1">{children}</dd>
    </div>
  );
}
