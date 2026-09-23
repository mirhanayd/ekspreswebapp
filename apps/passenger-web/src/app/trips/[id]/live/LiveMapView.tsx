'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as Ably from 'ably/promises';
import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { BusFront, Gauge, LocateFixed, MapPin, Ticket, X, ZoomIn, ZoomOut } from 'lucide-react';
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
  realtime: { channel: string; authUrl: string };
  routeGeometry: { type: 'LineString'; coordinates: Array<[number, number]> };
  latestPosition: TrackingPosition | null;
  trip: {
    id: string;
    departureTime: string;
    arrivalTime: string;
    status?: string;
    bus: { plateNumber: string; model?: string | null };
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
  connecting: 'bg-amber-400',
  live: 'bg-lime-500',
  delayed: 'bg-amber-400',
  stale: 'bg-amber-500',
  offline: 'bg-signal-500',
  forbidden: 'bg-signal-500',
};

/** "Sal, 22 Ağu" — the day label printed under each time in the reference. */
function dayLabel(value: string) {
  return new Date(value).toLocaleDateString('tr-TR', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}

/**
 * Live tracking — `ui/live-map-reference.png`.
 *
 * Full-bleed map with a circular dismiss control, a centred journey title and a
 * circular ticket control across the top; a stack of numbered stop tiles down
 * the left edge with the next stop filled amber; glass map controls down the
 * right edge; and a near-black journey panel at the bottom carrying the two
 * times either side of an amber duration pill, the two dates, a dashed amber
 * progress track, and a row of three dark status pills beneath it.
 */
export default function LiveMapView({ bootstrap }: { bootstrap: Bootstrap }) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const realtimeRef = useRef<Ably.Realtime | null>(null);
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
  const etaLabel =
    etaMinutes >= 60
      ? `${Math.floor(etaMinutes / 60)}s ${String(etaMinutes % 60).padStart(2, '0')}dk`
      : etaMinutes > 0
        ? `${etaMinutes} dk`
        : 'Varıyor';

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
        paint: { 'line-color': '#ffffff', 'line-width': 11, 'line-opacity': 0.95 },
      });
      instance.addLayer({
        id: 'demo-route-line',
        type: 'line',
        source: 'demo-route',
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: { 'line-color': '#C4D0C6', 'line-width': 5 },
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
        paint: { 'line-color': '#F7AA12', 'line-width': 5 },
      });

      const bounds = coordinates.reduce(
        (value, coordinate) => value.extend(coordinate),
        new maplibregl.LngLatBounds(first, first),
      );
      instance.fitBounds(bounds, {
        padding: { top: 120, bottom: 300, left: 110, right: 80 },
        maxZoom: 10,
      });

      new maplibregl.Marker({ color: '#051A09' }).setLngLat(first).addTo(instance);
      new maplibregl.Marker({ color: '#F0632A' }).setLngLat(last).addTo(instance);

      const markerElement = document.createElement('div');
      markerElement.className =
        'grid h-12 w-12 place-items-center rounded-full border-4 border-white bg-amber-400 shadow-lift';
      markerElement.innerHTML =
        '<span aria-hidden="true" style="font-size:19px;line-height:1;display:inline-block">🚌</span>';
      markerIconRef.current = markerElement.querySelector('span');
      markerRef.current = new maplibregl.Marker({ element: markerElement })
        .setLngLat(initial as [number, number])
        .addTo(instance);
    });

    const realtime = new Ably.Realtime({
      authUrl: bootstrap.realtime.authUrl,
      authMethod: 'POST',
      echoMessages: false,
    });
    realtimeRef.current = realtime;
    const channel = realtime.channels.get(bootstrap.realtime.channel);
    const onConnected = () => setConnected(true);
    const onDisconnected = () => setConnected(false);
    const onFailed = () => {
      setConnected(false);
      setTrackingState('forbidden');
    };
    const onPosition = (message: Ably.Types.Message) => {
      const next =
        typeof message.data === 'string'
          ? (JSON.parse(message.data) as TrackingPosition)
          : (message.data as TrackingPosition);
      if (next.tripId !== bootstrap.trip.id) return;
      setPosition(next);
      setTrackingState('live');
      markerRef.current?.setLngLat([next.longitude, next.latitude]);
      if (markerIconRef.current) {
        markerIconRef.current.style.transform = `rotate(${next.headingDeg}deg)`;
      }
    };
    realtime.connection.on('connected', onConnected);
    realtime.connection.on('disconnected', onDisconnected);
    realtime.connection.on('suspended', onDisconnected);
    realtime.connection.on('failed', onFailed);
    void channel.subscribe('location', onPosition).catch(onFailed);

    return () => {
      channel.unsubscribe('location', onPosition);
      realtime.connection.off('connected', onConnected);
      realtime.connection.off('disconnected', onDisconnected);
      realtime.connection.off('suspended', onDisconnected);
      realtime.connection.off('failed', onFailed);
      realtime.close();
      realtimeRef.current = null;
      map.current?.remove();
      map.current = null;
    };
  }, [bootstrap, coordinates]);

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

  const focusStop = useCallback((stop: { longitude: number; latitude: number }) => {
    map.current?.flyTo({ center: [stop.longitude, stop.latitude], zoom: 10.5, duration: 700 });
  }, []);

  return (
    <div className="relative h-full w-full">
      <div
        ref={mapContainer}
        className="absolute inset-0"
        role="region"
        aria-label="Canlı sefer haritası"
      />

      {/* Top row: dismiss · title · ticket ------------------------------ */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-start justify-between gap-3 px-6 pt-[calc(2.75rem+env(safe-area-inset-top,0px))] lg:pt-6">
        <Link
          href={`/tickets/${bootstrap.ticketId}`}
          aria-label="Canlı takibi kapat"
          className="icon-btn icon-btn-white pointer-events-auto"
        >
          <X className="h-5 w-5" aria-hidden />
        </Link>

        <div className="pointer-events-none min-w-0 pt-3 text-center">
          <h1 className="flex items-center justify-center gap-2 truncate font-display text-[1.0625rem] font-bold text-ink-900">
            <BusFront className="h-5 w-5 shrink-0" aria-hidden />
            <span className="truncate">
              {placeShortName(bootstrap.trip.route.origin.name)} –{' '}
              {placeShortName(bootstrap.trip.route.destination.name)}
            </span>
          </h1>
          <p className="mt-1 inline-flex items-center gap-1.5 rounded-full bg-white/85 px-2.5 py-1 text-[0.6875rem] font-semibold text-ink-700 shadow-glass backdrop-blur">
            <span
              className={`h-2 w-2 shrink-0 rounded-full ${stateTone[trackingState]} ${
                trackingState === 'live' ? 'animate-pulse-ring' : ''
              }`}
              aria-hidden
            />
            {stateLabels[trackingState]}
          </p>
        </div>

        <Link
          href={`/tickets/${bootstrap.ticketId}`}
          aria-label="Bilet özetini aç"
          className="icon-btn icon-btn-white pointer-events-auto"
        >
          <Ticket className="h-5 w-5" aria-hidden />
        </Link>
      </div>

      {/* Numbered stop tiles down the left edge ------------------------- */}
      {stops.length ? (
        <ul className="absolute left-6 top-1/2 z-10 flex -translate-y-1/2 flex-col gap-3">
          {stops.slice(0, 4).map((stop, index) => {
            const isNext = nextStop?.id === stop.id;
            const passed = stop.travelledKm <= (projection?.travelledKm ?? 0);
            return (
              <li key={stop.id}>
                <button
                  type="button"
                  onClick={() => focusStop(stop)}
                  aria-label={`${index + 1}. durak: ${stop.name}`}
                  title={stop.name}
                  className={`stop-tile ${isNext ? 'stop-tile-active' : ''} ${
                    passed && !isNext ? 'opacity-55' : ''
                  }`}
                >
                  {index + 1}
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}

      {/* Glass map controls down the right edge -------------------------- */}
      <div className="absolute right-6 top-1/2 z-10 flex -translate-y-1/2 flex-col gap-3.5">
        <button
          type="button"
          onClick={() => map.current?.zoomIn({ duration: 300 })}
          aria-label="Haritayı yakınlaştır"
          className="map-fab"
        >
          <ZoomIn className="h-[1.125rem] w-[1.125rem]" aria-hidden />
        </button>
        <button
          type="button"
          onClick={() => map.current?.zoomOut({ duration: 300 })}
          aria-label="Haritayı uzaklaştır"
          className="map-fab"
        >
          <ZoomOut className="h-[1.125rem] w-[1.125rem]" aria-hidden />
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
          <LocateFixed className="h-[1.125rem] w-[1.125rem]" aria-hidden />
        </button>
      </div>

      {/* Journey panel + status pills ------------------------------------ */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 px-6 pb-[calc(1.5rem+var(--safe-bottom))]">
        <section
          aria-label="Sefer durumu"
          className="panel-dark pointer-events-auto mx-auto max-w-2xl px-5 py-4"
        >
          <div className="flex items-center justify-between gap-3">
            <p className="num text-[0.9375rem] font-semibold text-white/60">
              {formatTime(bootstrap.trip.departureTime)}
            </p>
            <span className="duration-pill shrink-0">{etaLabel}</span>
            <p className="num text-[0.9375rem] font-semibold text-white/60">
              {formatTime(bootstrap.trip.arrivalTime)}
            </p>
          </div>

          <div className="mt-1.5 flex items-baseline justify-between gap-3">
            <p className="min-w-0 truncate font-display text-[1.0625rem] font-bold text-white">
              {dayLabel(bootstrap.trip.departureTime)}
            </p>
            <p className="min-w-0 truncate text-right font-display text-[1.0625rem] font-bold text-white">
              {dayLabel(bootstrap.trip.arrivalTime)}
            </p>
          </div>

          <div
            className="relative mt-4 flex items-center"
            role="progressbar"
            aria-valuenow={progressPercent}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Yolculuk ilerlemesi"
          >
            <span className="h-3 w-3 shrink-0 rounded-full bg-amber-400" />
            <span className="relative mx-1.5 h-0.5 flex-1">
              <span className="absolute inset-0 border-t-2 border-dashed border-amber-400/55" />
              <span
                className="absolute inset-y-0 left-0 border-t-2 border-amber-400 transition-[width] duration-700"
                style={{ width: `${progressPercent}%` }}
              />
            </span>
            <span className="h-3 w-3 shrink-0 rounded-full bg-white" />
          </div>

          <p className="mt-3 text-center text-[0.6875rem] font-semibold text-white/50">
            %{progressPercent} tamamlandı
            {metrics.totalKm > 0 ? ` · ${remainingKm.toFixed(0)} km kaldı` : ''}
            {position ? ` · ${formatTime(position.recordedAt)}` : ''}
          </p>
        </section>

        <ul className="hide-scrollbar pointer-events-auto mx-auto mt-3 flex max-w-2xl gap-2.5 overflow-x-auto">
          <li className="min-w-0 max-w-[44%] shrink-0">
            <span className="status-pill">
              <MapPin className="h-4 w-4 shrink-0 text-amber-400" aria-hidden />
              <span className="truncate">
                {nextStop ? nextStop.name : bootstrap.trip.route.destination.name}
              </span>
              {nextStopKm !== null ? (
                <span className="num shrink-0 text-amber-400">{nextStopKm.toFixed(0)} km</span>
              ) : null}
            </span>
          </li>
          <li>
            <span className="status-pill whitespace-nowrap">
              <BusFront className="h-4 w-4 shrink-0 text-white/50" aria-hidden />
              {bootstrap.trip.bus.plateNumber}
            </span>
          </li>
          <li>
            <span className="status-pill whitespace-nowrap">
              <Gauge className="h-4 w-4 shrink-0 text-white/50" aria-hidden />
              {Math.round(position?.speedKph || 0)} km/sa
            </span>
          </li>
        </ul>
      </div>
    </div>
  );
}
