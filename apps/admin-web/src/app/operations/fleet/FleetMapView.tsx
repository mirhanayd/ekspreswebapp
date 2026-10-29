'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { ArrowRight, Gauge, MapPin, Phone, RefreshCw, TriangleAlert, Users } from 'lucide-react';
import { FleetTrip } from '@/lib/admin-types';
import { PageHeader, StatusChip } from '@/components/ui';
import { formatClock } from '@/lib/trip-status';

export type FleetTripContext = {
  driverName: string | null;
  soldSeats: number;
  totalSeats: number;
};

const freshnessLabel: Record<FleetTrip['freshness'], string> = {
  live: 'Canlı',
  delayed: 'Gecikmeli',
  stale: 'Eski veri',
  offline: 'Çevrimdışı',
};

const freshnessClass: Record<FleetTrip['freshness'], string> = {
  live: 'chip-live',
  delayed: 'chip-warn',
  stale: 'chip-warn',
  offline: 'chip-neutral',
};

const ROUTE_ACTIVE = '#B8261B';
const ROUTE_IDLE = '#8A96A8';

// lucide "bus-front" outline, inlined because MapLibre markers are plain DOM nodes.
const BUS_ICON =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 6 2 7"/><path d="M10 6h4"/><path d="m22 7-2-1"/><rect width="16" height="16" x="4" y="3" rx="2"/><path d="M4 11h16"/><path d="M8 15h.01"/><path d="M16 15h.01"/><path d="M6 19v2"/><path d="M18 21v-2"/></svg>';

export default function FleetMapView({
  initialTrips,
  context,
  initialTripId,
}: {
  initialTrips: FleetTrip[];
  context: Record<string, FleetTripContext>;
  initialTripId: string | null;
}) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<Record<string, maplibregl.Marker>>({});
  const [mapLoaded, setMapLoaded] = useState(false);
  const [trips, setTrips] = useState(initialTrips);
  const [pollingError, setPollingError] = useState(false);
  const [selectedTripId, setSelectedTripId] = useState<string | null>(
    initialTrips.find((trip) => trip.tripId === initialTripId)?.tripId ??
      initialTrips[0]?.tripId ??
      null,
  );
  const selectedRef = useRef(selectedTripId);
  selectedRef.current = selectedTripId;

  useEffect(() => {
    if (!mapContainer.current) return;
    const map = new maplibregl.Map({
      container: mapContainer.current,
      style: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json',
      center: [41.9, 37.9],
      zoom: 7,
      attributionControl: { compact: true },
    });
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
    mapRef.current = map;

    map.on('load', () => {
      initialTrips.forEach((trip) => {
        if (!trip.routeGeometry) return;
        const sourceId = `route-${trip.tripId}`;
        map.addSource(sourceId, { type: 'geojson', data: trip.routeGeometry });
        map.addLayer({
          id: `${sourceId}-casing`,
          type: 'line',
          source: sourceId,
          layout: { 'line-cap': 'round', 'line-join': 'round' },
          paint: { 'line-color': '#ffffff', 'line-width': 8, 'line-opacity': 0.9 },
        });
        map.addLayer({
          id: sourceId,
          type: 'line',
          source: sourceId,
          layout: { 'line-cap': 'round', 'line-join': 'round' },
          paint: { 'line-color': ROUTE_IDLE, 'line-width': 3, 'line-opacity': 0.9 },
        });
      });
      setMapLoaded(true);
    });

    return () => {
      Object.values(markersRef.current).forEach((marker) => marker.remove());
      markersRef.current = {};
      map.remove();
      mapRef.current = null;
      setMapLoaded(false);
    };
  }, [initialTrips]);

  // Highlight the selected trip's route and marker.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;
    initialTrips.forEach((trip) => {
      const layerId = `route-${trip.tripId}`;
      if (!map.getLayer(layerId)) return;
      const active = trip.tripId === selectedTripId;
      map.setPaintProperty(layerId, 'line-color', active ? ROUTE_ACTIVE : ROUTE_IDLE);
      map.setPaintProperty(layerId, 'line-width', active ? 4.5 : 3);
      if (active) {
        map.moveLayer(`${layerId}-casing`);
        map.moveLayer(layerId);
      }
    });
    Object.entries(markersRef.current).forEach(([tripId, marker]) => {
      marker.getElement().dataset.selected = String(tripId === selectedTripId);
    });
  }, [initialTrips, mapLoaded, selectedTripId]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    trips.forEach((trip) => {
      if (!trip.latest) {
        markersRef.current[trip.tripId]?.remove();
        delete markersRef.current[trip.tripId];
        return;
      }
      const point: [number, number] = [trip.latest.longitude, trip.latest.latitude];
      const marker = markersRef.current[trip.tripId];
      if (!marker) {
        const element = document.createElement('button');
        element.type = 'button';
        element.className = 'fleet-marker';
        element.dataset.selected = String(trip.tripId === selectedRef.current);
        element.setAttribute('aria-label', `${trip.plateNumber} aracını seç`);
        element.innerHTML = BUS_ICON;
        element.addEventListener('click', () => setSelectedTripId(trip.tripId));
        markersRef.current[trip.tripId] = new maplibregl.Marker({ element })
          .setLngLat(point)
          .addTo(map);
      } else {
        marker.setLngLat(point);
      }
    });
  }, [trips]);

  const refresh = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/fleet', { cache: 'no-store' });
      if (!response.ok) throw new Error('fleet refresh failed');
      setTrips((await response.json()) as FleetTrip[]);
      setPollingError(false);
    } catch {
      setPollingError(true);
    }
  }, []);

  useEffect(() => {
    const timer = window.setInterval(refresh, 5000);
    return () => window.clearInterval(timer);
  }, [refresh]);

  const focusTrip = (trip: FleetTrip) => {
    setSelectedTripId(trip.tripId);
    if (trip.latest && mapRef.current) {
      mapRef.current.flyTo({
        center: [trip.latest.longitude, trip.latest.latitude],
        zoom: 10,
        duration: 800,
      });
    }
  };

  const liveCount = trips.filter((trip) => trip.freshness === 'live').length;
  const selected = trips.find((trip) => trip.tripId === selectedTripId) ?? null;

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Canlı filo"
        title="Aktif araçlar"
        description="Son kalıcı konum 5 saniyede bir yenilenir."
        actions={
          <button
            type="button"
            onClick={() => void refresh()}
            className="ops-btn ops-btn-secondary"
          >
            <RefreshCw className="h-4 w-4" aria-hidden />
            Yenile
          </button>
        }
      />

      {pollingError ? (
        <p
          role="status"
          className="flex items-center gap-2 rounded-card bg-[#FEF3C7] px-3 py-2 text-sm text-[#92400E]"
        >
          <TriangleAlert className="h-4 w-4 shrink-0" aria-hidden />
          Yenileme gecikti; son bilinen konum gösteriliyor.
        </p>
      ) : null}

      <div className="grid gap-3 lg:grid-cols-[20rem_minmax(0,1fr)]">
        <section
          className="surface min-w-0 lg:max-h-[40rem] lg:overflow-y-auto"
          aria-label="Araç listesi"
        >
          <div className="flex items-center justify-between border-b border-adm-line px-4 py-3">
            <h2 className="text-sm font-semibold">Araçlar</h2>
            <span className="text-sm text-adm-muted">
              {liveCount} / {trips.length} canlı
            </span>
          </div>
          <ul className="divide-y divide-adm-line">
            {trips.map((trip) => {
              const active = trip.tripId === selectedTripId;
              const info = context[trip.tripId];
              return (
                <li key={trip.tripId}>
                  <button
                    type="button"
                    onClick={() => focusTrip(trip)}
                    aria-pressed={active}
                    className={`flex w-full items-start gap-3 px-4 py-3 text-left transition ${
                      active ? 'bg-adm-sel-bg' : 'hover:bg-adm-bg'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="plate">{trip.plateNumber}</span>
                        <span className={`chip-status ${freshnessClass[trip.freshness]}`}>
                          {freshnessLabel[trip.freshness]}
                        </span>
                      </div>
                      <p className="mt-2 truncate text-sm font-medium">
                        {trip.originName} → {trip.destinationName}
                      </p>
                      <p className="mt-0.5 truncate text-xs text-adm-muted">
                        {info?.driverName ?? 'Şoför atanmadı'} ·{' '}
                        {trip.latest ? `${Math.round(trip.latest.speedKph)} km/sa` : 'konum yok'}
                      </p>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
          {!trips.length ? (
            <p className="px-4 py-8 text-center text-sm text-adm-muted">
              Biniş veya yolculuk aşamasında sefer yok.
            </p>
          ) : null}
        </section>

        <div className="relative min-w-0">
          <div className="surface relative h-[22rem] overflow-hidden sm:h-[32rem] lg:h-[40rem]">
            <div ref={mapContainer} className="h-full w-full" aria-label="Canlı filo haritası" />
            <span className="absolute left-3 top-3 inline-flex h-8 items-center gap-2 rounded-full bg-white px-3 text-sm font-medium text-[#166534] shadow-card ring-1 ring-adm-line">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#22C55E] opacity-60 motion-reduce:hidden" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-[#22C55E]" />
              </span>
              Canlı
            </span>
          </div>
          {selected ? <VehicleCard trip={selected} info={context[selected.tripId]} /> : null}
        </div>
      </div>
    </div>
  );
}

function VehicleCard({ trip, info }: { trip: FleetTrip; info?: FleetTripContext }) {
  return (
    <section
      aria-label={`${trip.plateNumber} detay`}
      className="surface mt-3 p-4 shadow-lg sm:absolute sm:bottom-4 sm:left-4 sm:mt-0 sm:w-[21rem]"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="plate text-sm">{trip.plateNumber}</span>
        <StatusChip status={trip.status} />
      </div>
      <p className="mt-3 font-medium">{info?.driverName ?? 'Şoför atanmadı'}</p>
      <p className="truncate text-sm text-adm-muted">
        {trip.originName} → {trip.destinationName}
      </p>
      <dl className="mt-3 grid grid-cols-2 gap-2">
        <Metric icon={Gauge} label="Hız">
          {trip.latest ? `${Math.round(trip.latest.speedKph)} km/sa` : '—'}
        </Metric>
        <Metric icon={Users} label="Yolcu">
          {info ? `${info.soldSeats}/${info.totalSeats}` : '—'}
        </Metric>
        <Metric icon={MapPin} label="Varış saati">
          {formatClock(trip.arrivalTime)}
        </Metric>
        <Metric icon={ArrowRight} label="Varış durağı">
          {trip.destinationName}
        </Metric>
      </dl>
      <p className="mt-2 text-xs text-adm-muted">
        {trip.ageSeconds === null
          ? 'Henüz konum alınmadı'
          : `Son sinyal ${trip.ageSeconds} sn önce`}
      </p>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <button
          type="button"
          className="ops-btn ops-btn-secondary px-2"
          disabled
          title="Sürücü telefon numarası kayıtlı değil"
        >
          <Phone className="h-4 w-4" aria-hidden />
          Şoförü ara
        </button>
        <Link
          href={`/operations/trips?trip=${trip.tripId}`}
          className="ops-btn ops-btn-primary px-2"
        >
          Sefer detayı
        </Link>
      </div>
    </section>
  );
}

function Metric({
  icon: Icon,
  label,
  children,
}: {
  icon: typeof Gauge;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-w-0 rounded-btn bg-adm-bg p-2.5">
      <dt className="flex items-center gap-1.5 text-xs text-adm-muted">
        <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />
        <span className="truncate">{label}</span>
      </dt>
      <dd className="mt-0.5 truncate text-sm font-medium">{children}</dd>
    </div>
  );
}
