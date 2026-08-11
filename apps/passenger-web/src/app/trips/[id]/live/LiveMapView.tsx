'use client';

import { useEffect, useRef, useState } from 'react';
import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { io, Socket } from 'socket.io-client';
import { Bus, ChevronLeft, Clock3, WifiOff } from 'lucide-react';
import Link from 'next/link';

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
  accessToken: string;
  routeGeometry: { type: 'LineString'; coordinates: Array<[number, number]> };
  latestPosition: TrackingPosition | null;
  trip: {
    id: string;
    arrivalTime: string;
    bus: { plateNumber: string };
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

const stateLabels: Record<TrackingState, string> = {
  connecting: 'Canlı konum bekleniyor',
  live: 'Canlı takip aktif',
  delayed: 'Konum gecikmeli geliyor',
  stale: 'Son konum eski olabilir',
  offline: 'Araç bağlantısı yok',
  forbidden: 'Takip yetkisi sona erdi',
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
    const coordinates = bootstrap.routeGeometry.coordinates;
    const first = coordinates[0];
    const last = coordinates[coordinates.length - 1];
    const initial = bootstrap.latestPosition
      ? [bootstrap.latestPosition.longitude, bootstrap.latestPosition.latitude]
      : first;

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: 'https://demotiles.maplibre.org/style.json',
      center: initial as [number, number],
      zoom: 8,
    });
    map.current.on('load', () => {
      map.current?.addSource('demo-route', {
        type: 'geojson',
        data: { type: 'Feature', properties: {}, geometry: bootstrap.routeGeometry },
      });
      map.current?.addLayer({
        id: 'demo-route-line',
        type: 'line',
        source: 'demo-route',
        paint: { 'line-color': '#b91c1c', 'line-width': 5, 'line-opacity': 0.8 },
      });
      const bounds = coordinates.reduce(
        (value, coordinate) => value.extend(coordinate),
        new maplibregl.LngLatBounds(first, first),
      );
      map.current?.fitBounds(bounds, { padding: 70, maxZoom: 10 });
      new maplibregl.Marker({ color: '#0f172a' }).setLngLat(first).addTo(map.current!);
      new maplibregl.Marker({ color: '#b91c1c' }).setLngLat(last).addTo(map.current!);

      const markerElement = document.createElement('div');
      markerElement.className =
        'flex h-10 w-10 items-center justify-center rounded-full border-4 border-white bg-red-700 shadow-lg';
      markerElement.innerHTML = '<span aria-hidden="true" style="font-size:20px">🚌</span>';
      markerIconRef.current = markerElement.querySelector('span');
      markerRef.current = new maplibregl.Marker({ element: markerElement })
        .setLngLat(initial as [number, number])
        .addTo(map.current!);
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
        markerIconRef.current.style.display = 'inline-block';
        markerIconRef.current.style.transform = `rotate(${next.headingDeg}deg)`;
      }
    });

    return () => {
      socketRef.current?.disconnect();
      map.current?.remove();
    };
  }, [bootstrap, socketOrigin]);

  const etaMinutes = Math.max(
    0,
    Math.round((new Date(bootstrap.trip.arrivalTime).getTime() - Date.now()) / 60000),
  );
  const indicatorColor =
    trackingState === 'live'
      ? 'bg-emerald-500'
      : trackingState === 'delayed' || trackingState === 'stale'
        ? 'bg-amber-500'
        : 'bg-red-500';

  return (
    <div className="relative flex h-full w-full flex-col">
      <div className="absolute left-0 right-0 top-0 z-10 p-4">
        <div className="mx-auto flex max-w-3xl items-center justify-between rounded-2xl bg-white/95 p-4 shadow-lg backdrop-blur-md">
          <Link
            href={`/tickets/${bootstrap.ticketId}`}
            className="rounded-full bg-gray-100 p-2 text-gray-600"
          >
            <ChevronLeft className="h-5 w-5" />
          </Link>
          <div className="text-center">
            <h1 className="font-bold text-gray-900">
              {bootstrap.trip.route.origin.name} → {bootstrap.trip.route.destination.name}
            </h1>
            <p className="flex items-center justify-center gap-2 text-sm text-gray-600">
              <span className={`h-2.5 w-2.5 rounded-full ${indicatorColor}`} />
              {stateLabels[trackingState]}
            </p>
          </div>
          <div className="w-9" />
        </div>
      </div>

      <div ref={mapContainer} className="w-full flex-1" />

      <div className="absolute bottom-8 left-4 right-4 z-10">
        <div className="mx-auto grid max-w-3xl grid-cols-2 gap-3 rounded-2xl border bg-white p-4 shadow-xl sm:grid-cols-3">
          <div className="flex items-center gap-3">
            <Bus className="h-6 w-6 text-red-700" />
            <div>
              <p className="text-xs text-gray-500">Araç</p>
              <p className="font-bold text-gray-900">{bootstrap.trip.bus.plateNumber}</p>
            </div>
          </div>
          <div className="flex items-center justify-end gap-3 border-l pl-3 sm:justify-center sm:border-x sm:px-3">
            <Clock3 className="h-5 w-5 text-gray-500" />
            <div>
              <p className="text-xs text-gray-500">Planlı varış</p>
              <p className="font-bold text-gray-900">
                {etaMinutes > 0 ? `~${etaMinutes} dk` : 'Yaklaşıyor'}
              </p>
            </div>
          </div>
          <div className="col-span-2 flex items-center justify-between gap-3 border-t pt-3 sm:col-span-1 sm:justify-end sm:border-t-0 sm:pt-0">
            {trackingState === 'offline' ? <WifiOff className="h-5 w-5 text-red-600" /> : null}
            <div className="text-right">
              <p className="text-xs text-gray-500">Hız</p>
              <p className="font-bold text-gray-900">{Math.round(position?.speedKph || 0)} km/sa</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
