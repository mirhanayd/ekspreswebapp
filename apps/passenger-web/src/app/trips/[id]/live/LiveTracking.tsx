'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as Ably from 'ably/promises';
import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { ChevronRight, Bell, Check } from 'lucide-react';
import Image from 'next/image';
import { BackButton } from '@/components/nav/BackButton';
import { useNav } from '@/components/nav/NavProvider';
import { NotificationBell } from '@/components/notifications/NotificationBell';
import { useNotifications } from '@/components/notifications/NotificationProvider';
import { toLngLat } from '@/lib/geo';
import { circleRing, pointAtRouteKm, zoomForDistance } from '@/lib/live-geo';
import { formatKm, formatStoredTime, minutesForKm, placeShortName } from '@/lib/format';
import { measureRoute, projectOnRoute, remainingToStop } from '@/lib/route-progress';

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

type Bootstrap = {
  ticketId: string;
  seatNo?: string;
  realtime: { channel: string; authUrl: string };
  routeGeometry: { type: 'LineString'; coordinates: Array<[number, number]> };
  latestPosition: TrackingPosition | null;
  alighting: { name: string; coordinates: unknown } | null;
  trip: {
    id: string;
    arrivalTime: string;
    status?: string;
    bus: { plateNumber: string; model?: string | null };
    route: { origin: { name: string }; destination: { name: string } };
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

const stateLabels: Record<Exclude<TrackingState, 'live'>, string> = {
  connecting: 'Konum bekleniyor',
  delayed: 'Konum gecikmeli',
  stale: 'Konum eski olabilir',
  offline: 'Bağlantı yok',
  forbidden: 'Takip yetkisi bitti',
};

// Copied from maplibre-gl by scripts/copy-maplibre-worker.mjs; see the note there.
maplibregl.setWorkerUrl('/maplibre/maplibre-gl-worker.mjs');

const MAP_STYLE = 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json';
const APPROACH_KM = 8;
const ARRIVED_KM = 0.05;
const BRAND = '#C8231B';

const emptyLine = {
  type: 'Feature',
  properties: {},
  geometry: { type: 'LineString', coordinates: [] },
} as const;

function pillElement(label: string) {
  const element = document.createElement('div');
  element.style.cssText =
    'display:inline-flex;align-items:center;gap:4px;height:26px;padding:0 10px;border-radius:13px;box-sizing:border-box;border:1.5px solid #C8231B;font:800 12px Archivo,sans-serif;white-space:nowrap;box-shadow:0 4px 10px rgba(22,23,27,.12);background:#fff;color:#A11C15;transition:background 300ms ease,color 300ms ease';
  element.textContent = label;
  return element;
}

function setPillSent(element: HTMLElement, label: string, sent: boolean) {
  element.style.background = sent ? BRAND : '#FFFFFF';
  element.style.color = sent ? '#FFFFFF' : '#A11C15';
  element.textContent = sent ? `✓ ${label}` : label;
}

/**
 * Live tracking: the camera follows the bus and zooms in as it nears the
 * passenger's stop, 5 km and 1 km rings sit around that stop, and the panel
 * below shows the distance left, the minutes and the 8 km approach bar.
 * Positions arrive over the same ticket-scoped Ably channel as before.
 */
export default function LiveTracking({ bootstrap }: { bootstrap: Bootstrap }) {
  const nav = useNav();
  const { prefs, openSettings, checkBanners } = useNotifications();
  const mapContainer = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const markers = useRef<{
    bus?: maplibregl.Marker;
    busBody?: HTMLElement;
    p5?: HTMLElement;
    p1?: HTMLElement;
  }>({});
  const followPausedUntil = useRef(0);
  const reducedMotion = useRef(false);
  const lastRemaining = useRef<number | null>(null);

  const [position, setPosition] = useState<TrackingPosition | null>(bootstrap.latestPosition);
  const [connected, setConnected] = useState(false);
  const [trackingState, setTrackingState] = useState<TrackingState>(
    stateFromAge(bootstrap.latestPosition?.recordedAt || null, false),
  );
  const [flash, setFlash] = useState<5 | 1 | null>(null);

  const coordinates = bootstrap.routeGeometry.coordinates;
  const metrics = useMemo(() => measureRoute(coordinates), [coordinates]);
  const stopPoint = useMemo(() => {
    const fromBootstrap = toLngLat(bootstrap.alighting?.coordinates);
    if (fromBootstrap) return fromBootstrap;
    const last = coordinates[coordinates.length - 1];
    return { longitude: last[0], latitude: last[1] };
  }, [bootstrap.alighting, coordinates]);
  const stopName = bootstrap.alighting?.name ?? bootstrap.trip.route.destination.name;

  const progress = useMemo(
    () =>
      position
        ? remainingToStop(
            coordinates,
            metrics,
            { longitude: position.longitude, latitude: position.latitude },
            stopPoint,
          )
        : null,
    [position, coordinates, metrics, stopPoint],
  );
  const remainingKm = progress?.remainingKm ?? null;
  const arrived =
    bootstrap.trip.status === 'completed' || (remainingKm !== null && remainingKm <= ARRIVED_KM);
  const minutes = remainingKm === null ? null : minutesForKm(remainingKm);
  const gauge =
    remainingKm === null ? 0 : Math.min(1, Math.max(0, (APPROACH_KM - remainingKm) / APPROACH_KM));
  const sent5 = remainingKm !== null && remainingKm <= 5;
  const sent1 = remainingKm !== null && remainingKm <= 1;
  // The pills are created after the first render, so they read their starting state from this ref.
  const pillState = useRef({ five: false, one: false });
  pillState.current = { five: sent5 && prefs.km5, one: sent1 && prefs.km1 };
  // The ETA uses the visitor's clock, so it replaces the scheduled arrival only after mount.
  const [clockReady, setClockReady] = useState(false);
  useEffect(() => setClockReady(true), []);
  const arrival =
    clockReady && minutes !== null
      ? new Date(Date.now() + minutes * 60_000).toLocaleTimeString('tr-TR', {
          hour: '2-digit',
          minute: '2-digit',
        })
      : formatStoredTime(bootstrap.trip.arrivalTime);

  useEffect(() => {
    const interval = setInterval(() => {
      setTrackingState((current) =>
        current === 'forbidden' ? current : stateFromAge(position?.recordedAt || null, connected),
      );
    }, 5000);
    return () => clearInterval(interval);
  }, [connected, position?.recordedAt]);

  // Build the map, route, rings and markers once.
  useEffect(() => {
    if (!mapContainer.current) return;
    reducedMotion.current = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const stop: [number, number] = [stopPoint.longitude, stopPoint.latitude];
    const start = bootstrap.latestPosition
      ? ([bootstrap.latestPosition.longitude, bootstrap.latestPosition.latitude] as [
          number,
          number,
        ])
      : coordinates[0];

    const instance = new maplibregl.Map({
      container: mapContainer.current,
      style: MAP_STYLE,
      center: start,
      zoom: 11,
      attributionControl: { compact: true },
    });
    map.current = instance;
    instance.on('dragstart', () => {
      followPausedUntil.current = Date.now() + 10_000;
    });

    // style.load, not load: `load` also waits for every first tile, and the overlays must not.
    instance.on('style.load', () => {
      instance.addSource('approach', {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: [5, 1].map((km) => ({
            type: 'Feature',
            properties: { km },
            geometry: { type: 'Polygon', coordinates: [circleRing(stop, km)] },
          })),
        },
      });
      instance.addLayer({
        id: 'approach-1-fill',
        type: 'fill',
        source: 'approach',
        filter: ['==', ['get', 'km'], 1],
        paint: { 'fill-color': BRAND, 'fill-opacity': 0.06 },
      });
      instance.addLayer({
        id: 'approach-ring',
        type: 'line',
        source: 'approach',
        paint: {
          'line-color': BRAND,
          'line-width': ['case', ['==', ['get', 'km'], 5], 2, 2],
          'line-opacity': 0.6,
          'line-dasharray': [3, 3],
        },
      });
      instance.addSource('route', {
        type: 'geojson',
        data: { type: 'Feature', properties: {}, geometry: bootstrap.routeGeometry },
      });
      instance.addSource('route-done', { type: 'geojson', data: emptyLine });
      instance.addSource('route-todo', { type: 'geojson', data: emptyLine });
      const round = { 'line-cap': 'round', 'line-join': 'round' } as const;
      instance.addLayer({
        id: 'route-done',
        type: 'line',
        source: 'route-done',
        layout: round,
        paint: { 'line-color': '#A9ACB2', 'line-width': 5 },
      });
      instance.addLayer({
        id: 'route-todo-casing',
        type: 'line',
        source: 'route-todo',
        layout: round,
        paint: { 'line-color': '#FFFFFF', 'line-width': 10 },
      });
      instance.addLayer({
        id: 'route-todo',
        type: 'line',
        source: 'route-todo',
        layout: round,
        paint: { 'line-color': '#15161A', 'line-width': 5 },
      });

      // Pills where the route crosses the 5 km and 1 km rings.
      const stopAlong =
        projectOnRoute(coordinates, metrics, stopPoint)?.travelledKm ?? metrics.totalKm;
      const p5 = pillElement('5 km');
      const p1 = pillElement('1 km');
      markers.current.p5 = p5;
      markers.current.p1 = p1;
      setPillSent(p5, '5 km', pillState.current.five);
      setPillSent(p1, '1 km', pillState.current.one);
      new maplibregl.Marker({ element: p5, offset: [0, -30] })
        .setLngLat(pointAtRouteKm(coordinates, metrics, stopAlong - 5))
        .addTo(instance);
      new maplibregl.Marker({ element: p1, offset: [0, -30] })
        .setLngLat(pointAtRouteKm(coordinates, metrics, stopAlong - 1))
        .addTo(instance);

      const pin = document.createElement('div');
      pin.innerHTML =
        '<svg width="34" height="40" viewBox="0 0 34 40" aria-hidden="true" style="filter:drop-shadow(0 6px 10px rgba(200,35,27,.35))"><path d="M17 39S32 26.5 32 15.5A15 15 0 0 0 2 15.5C2 26.5 17 39 17 39z" fill="#C8231B"/><circle cx="17" cy="15.5" r="6" fill="#fff"/></svg>';
      new maplibregl.Marker({ element: pin, anchor: 'bottom' }).setLngLat(stop).addTo(instance);

      const label = document.createElement('div');
      label.style.cssText =
        'display:flex;flex-direction:column;gap:1px;max-width:150px;padding:7px 11px;border-radius:12px;background:#fff;box-shadow:0 10px 24px rgba(22,23,27,.16);font-family:Archivo,sans-serif';
      const name = document.createElement('span');
      name.style.cssText =
        'font-size:13px;font-weight:800;white-space:nowrap;overflow:hidden;text-overflow:ellipsis';
      name.textContent = stopName;
      const note = document.createElement('span');
      note.style.cssText = 'font-size:11px;font-weight:700;color:#A11C15';
      note.textContent = `İnişin · ${formatStoredTime(bootstrap.trip.arrivalTime)}`;
      label.append(name, note);
      new maplibregl.Marker({ element: label, anchor: 'top', offset: [0, 12] })
        .setLngLat(stop)
        .addTo(instance);

      const busElement = document.createElement('div');
      busElement.style.cssText = 'position:relative;width:36px;height:36px';
      busElement.innerHTML =
        '<span style="position:absolute;inset:-22px;border-radius:50%;background:rgba(21,22,26,.18);animation:bus-pulse 2s ease-out infinite"></span>' +
        '<span data-bus-body style="position:absolute;inset:0;display:grid;place-items:center;border-radius:50%;box-sizing:border-box;background:#15161A;border:3px solid #fff;box-shadow:0 8px 18px rgba(22,23,27,.35);transition:transform 500ms linear"><svg width="15" height="15" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3l7.5 17L12 15.5 4.5 20z" fill="#fff"/></svg></span>';
      markers.current.busBody =
        busElement.querySelector<HTMLElement>('[data-bus-body]') ?? undefined;
      markers.current.bus = new maplibregl.Marker({ element: busElement })
        .setLngLat(start)
        .addTo(instance);
      instance.fire('ske:ready');
    });

    const realtime = new Ably.Realtime({
      authUrl: bootstrap.realtime.authUrl,
      authMethod: 'POST',
      echoMessages: false,
    });
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
      markers.current = {};
      instance.remove();
      map.current = null;
    };
  }, [bootstrap, coordinates, metrics, stopPoint, stopName]);

  /** Moves the bus, repaints the route halves and steers the camera. */
  const follow = useCallback(() => {
    const instance = map.current;
    // The overlays exist once style.load has run; waiting for isStyleLoaded() would also wait for tiles.
    if (!instance || !instance.getSource('route-done') || !position) return;
    const busLngLat: [number, number] = [position.longitude, position.latitude];
    markers.current.bus?.setLngLat(busLngLat);
    if (markers.current.busBody) {
      markers.current.busBody.style.transform = `rotate(${position.headingDeg}deg)`;
    }
    const projection = projectOnRoute(coordinates, metrics, position);
    if (projection) {
      (instance.getSource('route-done') as maplibregl.GeoJSONSource | undefined)?.setData({
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'LineString',
          coordinates: [...coordinates.slice(0, projection.index + 1), busLngLat],
        },
      });
      (instance.getSource('route-todo') as maplibregl.GeoJSONSource | undefined)?.setData({
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'LineString',
          coordinates: [busLngLat, ...coordinates.slice(projection.index + 1)],
        },
      });
    }
    if (Date.now() < followPausedUntil.current) return;
    const straightKm = Math.hypot(
      (position.longitude - stopPoint.longitude) * 87.9,
      (position.latitude - stopPoint.latitude) * 111.2,
    );
    // Frame the bus and the stop together, above the bottom panel.
    instance.easeTo({
      center: [
        (position.longitude + stopPoint.longitude) / 2,
        (position.latitude + stopPoint.latitude) / 2,
      ],
      zoom: zoomForDistance(straightKm),
      padding: {
        top: 90,
        bottom: (panelRef.current?.offsetHeight ?? 380) + 30,
        left: 20,
        right: 20,
      },
      duration: reducedMotion.current ? 0 : 900,
      essential: true,
    });
  }, [position, coordinates, metrics, stopPoint]);

  useEffect(() => {
    const instance = map.current;
    if (!instance) return;
    follow();
    instance.once('ske:ready' as never, follow);
    return () => {
      instance.off('ske:ready' as never, follow);
    };
  }, [follow]);

  // Pills and rings react to the thresholds being passed.
  useEffect(() => {
    if (markers.current.p5) setPillSent(markers.current.p5, '5 km', sent5 && prefs.km5);
    if (markers.current.p1) setPillSent(markers.current.p1, '1 km', sent1 && prefs.km1);
    const instance = map.current;
    if (instance?.getLayer('approach-ring')) {
      instance.setPaintProperty('approach-ring', 'line-opacity', flash ? 0.95 : 0.6);
      instance.setPaintProperty('approach-ring', 'line-width', flash ? 4 : 2);
    }
  }, [sent5, sent1, prefs.km5, prefs.km1, flash]);

  // Flash the ring and ask for the banner the moment the distance first drops under a threshold.
  useEffect(() => {
    if (remainingKm === null) return;
    const before = lastRemaining.current;
    lastRemaining.current = remainingKm;
    if (before === null) return;
    const crossed = ([5, 1] as const).find((km) => before > km && remainingKm <= km);
    if (!crossed) return;
    setFlash(crossed);
    const timers = [
      window.setTimeout(() => setFlash(null), 1400),
      window.setTimeout(checkBanners, 2000),
      window.setTimeout(checkBanners, 6000),
    ];
    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, [remainingKm, checkBanners]);

  const reminder = `${
    prefs.km5 ? (sent5 ? '5 km gönderildi' : '5 km bekliyor') : '5 km kapalı'
  } · ${prefs.km1 ? (sent1 ? '1 km gönderildi' : '1 km bekliyor') : '1 km kapalı'}`;
  const seatLabel = bootstrap.seatNo ? `Koltuk ${bootstrap.seatNo}` : null;
  const subtitle = `${stopName}${seatLabel ? ` · ${seatLabel}` : ''}`;
  const pillText =
    trackingState === 'live'
      ? 'CANLI'
      : stateLabels[trackingState as Exclude<TrackingState, 'live'>];
  const tickStyle = (sent: boolean, on: boolean, flashing: boolean): React.CSSProperties => ({
    background: sent && on ? BRAND : '#FFFFFF',
    borderColor: on ? BRAND : '#C9C9C3',
    transform: `scale(${flashing ? 1.35 : 1})`,
    transition: 'background 300ms ease, transform 420ms cubic-bezier(.34,1.56,.64,1)',
  });

  return (
    <div className="relative h-[100dvh] w-full overflow-hidden bg-[#ECECE6]">
      {/* maplibre-gl.css makes its container position:relative, so the box that fills the screen is a wrapper. */}
      <div className="absolute inset-0">
        <div
          ref={mapContainer}
          className="h-full w-full"
          role="region"
          aria-label="Canlı sefer haritası"
        />
      </div>

      <div
        className="absolute inset-x-4 z-[5] flex items-center gap-2.5"
        style={{ top: 'calc(14px + var(--safe-top))' }}
      >
        <BackButton fallback="/tickets" className="!border-0" />
        <span
          className="inline-flex h-11 items-center gap-2 whitespace-nowrap rounded-full bg-white px-3.5 text-[13px] font-bold"
          style={{ boxShadow: '0 6px 16px rgba(22,23,27,.14)' }}
        >
          <span
            aria-hidden
            className={`live-dot h-2 w-2 ${trackingState === 'live' ? 'text-sk-brand' : 'text-[#B9BAB5]'}`}
          />
          <span className="font-extrabold text-sk-brandInk">{pillText}</span>
          {bootstrap.trip.bus.plateNumber}
        </span>
        <span className="ml-auto">
          <NotificationBell tone="light" subtitle={subtitle} />
        </span>
      </div>

      <section
        ref={panelRef}
        aria-label="Yolculuk durumu"
        className="fixed-col bottom-0 z-[6] box-border rounded-t-[30px] bg-white px-5 pt-[26px]"
        style={{
          paddingBottom: 'calc(24px + var(--safe-bottom))',
          boxShadow: '0 -18px 40px -16px rgba(22,23,27,.28)',
        }}
      >
        <span
          aria-hidden
          className="absolute left-1/2 top-2.5 -ml-5 h-1 w-10 rounded-sm bg-[#DCDCD6]"
        />

        <div
          aria-hidden={arrived}
          className="flex flex-col gap-[14px]"
          style={{
            opacity: arrived ? 0 : 1,
            transform: `translateY(${arrived ? -16 : 0}px)`,
            visibility: arrived ? 'hidden' : 'visible',
            height: arrived ? 0 : undefined,
            overflow: arrived ? 'hidden' : undefined,
            transition: 'opacity 320ms ease, transform 520ms cubic-bezier(.22,1,.36,1)',
          }}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex flex-col gap-[3px]">
              <span className="eyebrow">İniş durağın</span>
              <h2 className="m-0 text-[22px] font-extrabold">{stopName}</h2>
            </div>
            <div className="flex flex-col items-end gap-[3px]">
              <span className="eyebrow">Tahmini varış</span>
              <span className="num-md text-[22px] [font-stretch:115%]">{arrival}</span>
            </div>
          </div>

          <div className="flex items-baseline gap-2">
            <span className="num text-[62px] leading-[0.9] tracking-[-0.035em]" aria-live="off">
              {remainingKm === null ? '–' : formatKm(remainingKm)}
            </span>
            <span className="text-xl font-extrabold">km</span>
            <span className="ml-auto text-base font-bold text-sk-ink2">
              {minutes === null ? 'Konum bekleniyor' : `≈ ${minutes} dk`}
            </span>
          </div>

          <div aria-hidden className="relative h-11">
            <span className="absolute left-0 right-[9px] top-[9px] h-1.5 rounded-sm bg-[#ECECE8]" />
            <span
              className="absolute left-0 top-[9px] h-1.5 rounded-sm bg-sk-ink"
              style={{ width: `calc((100% - 9px) * ${gauge})`, transition: 'width 900ms linear' }}
            />
            <span
              className="absolute top-[3px] box-border h-[18px] w-[18px] -ml-[9px] rounded-full border-[2.5px]"
              style={{
                left: 'calc((100% - 9px) * .375)',
                ...tickStyle(sent5, prefs.km5, flash === 5),
              }}
            />
            <span
              className="absolute top-[3px] box-border h-[18px] w-[18px] -ml-[9px] rounded-full border-[2.5px]"
              style={{
                left: 'calc((100% - 9px) * .875)',
                ...tickStyle(sent1, prefs.km1, flash === 1),
              }}
            />
            <svg width="18" height="22" viewBox="0 0 34 40" className="absolute right-0 -top-0.5">
              <path
                d="M17 39S32 26.5 32 15.5A15 15 0 0 0 2 15.5C2 26.5 17 39 17 39z"
                fill={BRAND}
              />
              <circle cx="17" cy="15.5" r="6" fill="#fff" />
            </svg>
            <span
              className="absolute top-0.5 box-border h-5 w-5 -ml-2.5 rounded-full border-[3px] border-white bg-sk-ink"
              style={{
                left: `calc((100% - 9px) * ${gauge})`,
                boxShadow: '0 2px 8px rgba(22,23,27,.35)',
                transition: 'left 900ms linear',
              }}
            />
            <span className="absolute left-0 top-[26px] text-[11px] font-bold text-sk-ink3">
              8 km
            </span>
            <span
              className={`absolute top-[26px] text-[11px] font-extrabold ${prefs.km5 ? 'text-sk-brandInk' : 'text-sk-ink3'}`}
              style={{ left: 'calc((100% - 9px) * .375 - 14px)' }}
            >
              5 km
            </span>
            <span
              className={`absolute top-[26px] text-[11px] font-extrabold ${prefs.km1 ? 'text-sk-brandInk' : 'text-sk-ink3'}`}
              style={{ left: 'calc((100% - 9px) * .875 - 14px)' }}
            >
              1 km
            </span>
          </div>

          <button
            type="button"
            onClick={() => openSettings(subtitle)}
            className="flex min-h-14 items-center gap-3 rounded-[18px] border-0 bg-[#F4F4F1] px-3 text-left"
          >
            <span className="grid h-9 w-9 flex-none place-items-center rounded-[11px] bg-sk-tint text-sk-brand">
              <Bell size={18} strokeWidth={2} aria-hidden />
            </span>
            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="text-[15px] font-extrabold">İniş hatırlatıcı</span>
              <span className="text-[13px] text-sk-ink2">{reminder}</span>
            </span>
            <ChevronRight size={16} strokeWidth={2.4} aria-hidden className="text-[#9A9EA5]" />
          </button>

          <div className="flex items-center gap-3">
            <Image
              src="/brand/coach.jpg"
              alt={`Otobüs ${bootstrap.trip.bus.plateNumber}`}
              width={64}
              height={40}
              className="h-10 w-16 flex-none rounded-[10px] object-cover [object-position:64%_62%]"
            />
            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="text-sm font-extrabold">{bootstrap.trip.bus.plateNumber}</span>
              <span className="truncate text-[13px] text-sk-ink2">
                {[seatLabel, bootstrap.trip.bus.model].filter(Boolean).join(' · ')}
              </span>
            </span>
          </div>
        </div>

        <div
          aria-hidden={!arrived}
          role={arrived ? 'status' : undefined}
          className="flex flex-col items-center gap-3 text-center"
          style={{
            opacity: arrived ? 1 : 0,
            transform: `scale(${arrived ? 1 : 0.9})`,
            visibility: arrived ? 'visible' : 'hidden',
            height: arrived ? undefined : 0,
            overflow: arrived ? undefined : 'hidden',
            transition:
              'opacity 360ms ease 120ms, transform 620ms cubic-bezier(.34,1.45,.64,1) 120ms',
          }}
        >
          <span className="grid h-[76px] w-[76px] place-items-center rounded-full bg-sk-dark text-white">
            <Check size={34} strokeWidth={3} aria-hidden />
          </span>
          <h2 className="m-0 mt-1 text-2xl font-extrabold">
            {placeShortName(stopName)} durağına vardın
          </h2>
          <p className="m-0 max-w-[300px] text-[15px] leading-snug text-sk-ink2">
            İyi günler. {seatLabel ? `${seatLabel}’te eşyanı unutma.` : 'Eşyalarını unutma.'}
          </p>
          <button
            type="button"
            onClick={() => nav.replace('/')}
            className="btn btn-brand mt-2 w-full"
          >
            Ana sayfaya dön
          </button>
        </div>
      </section>
    </div>
  );
}
