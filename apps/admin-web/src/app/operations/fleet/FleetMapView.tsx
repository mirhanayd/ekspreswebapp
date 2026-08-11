'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { Activity, Clock3, Gauge, MapPin, RefreshCw, TriangleAlert } from 'lucide-react';
import { FleetTrip } from '@/lib/admin-types';
import { PageHeader } from '@/components/ui';

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

const statusLabel: Record<string, string> = {
  boarding: 'Biniş',
  in_transit: 'Yolda',
  scheduled: 'Planlandı',
};

export default function FleetMapView({ initialTrips }: { initialTrips: FleetTrip[] }) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<Record<string, maplibregl.Marker>>({});
  const [trips, setTrips] = useState(initialTrips);
  const [pollingError, setPollingError] = useState(false);
  const [selectedTripId, setSelectedTripId] = useState<string | null>(
    initialTrips[0]?.tripId ?? null,
  );

  useEffect(() => {
    if (!mapContainer.current) return;
    const map = new maplibregl.Map({
      container: mapContainer.current,
      style: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json',
      center: [41.9, 37.9],
      zoom: 7,
      attributionControl: false,
    });
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
    mapRef.current = map;

    map.on('load', () => {
      initialTrips.forEach((trip, index) => {
        if (!trip.routeGeometry) return;
        const sourceId = `route-${trip.tripId}`;
        map.addSource(sourceId, { type: 'geojson', data: trip.routeGeometry });
        map.addLayer({
          id: `${sourceId}-casing`,
          type: 'line',
          source: sourceId,
          layout: { 'line-cap': 'round', 'line-join': 'round' },
          paint: { 'line-color': '#ffffff', 'line-width': 9, 'line-opacity': 0.9 },
        });
        map.addLayer({
          id: sourceId,
          type: 'line',
          source: sourceId,
          layout: { 'line-cap': 'round', 'line-join': 'round' },
          paint: {
            'line-color': index === 0 ? '#A32619' : '#6A6058',
            'line-width': index === 0 ? 4.5 : 3,
            'line-opacity': 0.9,
          },
        });
      });
    });

    return () => {
      Object.values(markersRef.current).forEach((marker) => marker.remove());
      markersRef.current = {};
      map.remove();
      mapRef.current = null;
    };
  }, [initialTrips]);

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
        const element = document.createElement('div');
        element.className =
          'grid h-9 w-9 place-items-center rounded-full border-[3px] border-white bg-brand-700 text-base shadow-lg';
        element.setAttribute('aria-label', `${trip.plateNumber} araç konumu`);
        const icon = document.createElement('span');
        icon.textContent = '🚌';
        element.appendChild(icon);

        const popupContent = document.createElement('div');
        popupContent.className = 'text-sm';
        const title = document.createElement('strong');
        title.textContent = trip.plateNumber;
        const detail = document.createElement('p');
        detail.textContent = `${trip.originName} → ${trip.destinationName}`;
        popupContent.append(title, detail);

        markersRef.current[trip.tripId] = new maplibregl.Marker({ element })
          .setLngLat(point)
          .setPopup(new maplibregl.Popup({ offset: 20 }).setDOMContent(popupContent))
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

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Canlı Filo"
        title="Aktif araçlar"
        description="Konum anlık görüntüsü Redis üzerinden 5 saniyede bir yenilenir."
        actions={
          <>
            <span className="chip-status chip-live">
              <Activity className="h-3.5 w-3.5" aria-hidden />
              {liveCount} / {trips.length} canlı
            </span>
            <button type="button" onClick={() => void refresh()} className="ops-btn ops-btn-secondary">
              <RefreshCw className="h-4 w-4" aria-hidden />
              <span className="hidden sm:inline">Yenile</span>
            </button>
          </>
        }
      />

      {pollingError ? (
        <p role="status" className="chip-status chip-warn !rounded-xl !px-3 !py-2 !normal-case">
          <TriangleAlert className="h-4 w-4" aria-hidden />
          Yenileme gecikti; son bilinen konum gösteriliyor.
        </p>
      ) : null}

      <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="surface h-[24rem] overflow-hidden sm:h-[32rem] xl:h-[36rem]">
          <div ref={mapContainer} className="h-full w-full" aria-label="Canlı filo haritası" />
        </div>

        <div className="space-y-2.5">
          {trips.map((trip) => {
            const selected = trip.tripId === selectedTripId;
            return (
              <article
                key={trip.tripId}
                className={`surface p-4 transition ${
                  selected ? 'ring-2 ring-brand-600' : ''
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-display text-lg font-extrabold text-ink-900">
                      {trip.plateNumber}
                    </p>
                    <p className="mt-0.5 flex items-center gap-1.5 truncate text-xs text-ink-500">
                      <MapPin className="h-3 w-3 shrink-0" aria-hidden />
                      {trip.originName} → {trip.destinationName}
                    </p>
                  </div>
                  <span className={`chip-status shrink-0 ${freshnessClass[trip.freshness]}`}>
                    {freshnessLabel[trip.freshness]}
                  </span>
                </div>

                <dl className="mt-3 grid grid-cols-2 gap-2">
                  <Metric icon={<Gauge aria-hidden />} label="Hız">
                    {trip.latest ? `${Math.round(trip.latest.speedKph)} km/sa` : '—'}
                  </Metric>
                  <Metric icon={<Clock3 aria-hidden />} label="Veri yaşı">
                    {trip.ageSeconds === null ? 'Konum yok' : `${trip.ageSeconds} sn`}
                  </Metric>
                  <Metric icon={<Activity aria-hidden />} label="Durum">
                    {statusLabel[trip.status] ?? trip.status}
                  </Metric>
                  <Metric icon={<Clock3 aria-hidden />} label="Varış">
                    {new Date(trip.arrivalTime).toLocaleTimeString('tr-TR', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </Metric>
                </dl>

                <button
                  type="button"
                  onClick={() => focusTrip(trip)}
                  disabled={!trip.latest}
                  className="ops-btn ops-btn-secondary mt-3 w-full"
                >
                  <MapPin className="h-4 w-4" aria-hidden />
                  Haritada odakla
                </button>
              </article>
            );
          })}

          {!trips.length ? (
            <div className="surface border-dashed p-6 text-center text-sm text-ink-500">
              Biniş veya yolculuk aşamasında sefer yok.
            </div>
          ) : null}
        </div>
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
    <div className="min-w-0 rounded-lg bg-ink-50 p-2.5 ring-1 ring-inset ring-ink-100">
      <dt className="flex items-center gap-1.5 text-2xs font-bold uppercase tracking-wide text-ink-500">
        <span className="text-ink-400 [&>svg]:h-3 [&>svg]:w-3">{icon}</span>
        <span className="truncate">{label}</span>
      </dt>
      <dd className="mt-0.5 truncate text-sm font-semibold text-ink-900">{children}</dd>
    </div>
  );
}
