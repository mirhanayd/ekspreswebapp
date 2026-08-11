'use client';

import { useEffect, useRef, useState } from 'react';
import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { FleetTrip } from '@/lib/admin-types';

const freshnessLabel: Record<FleetTrip['freshness'], string> = {
  live: 'Canlı',
  delayed: 'Gecikmeli',
  stale: 'Eski veri',
  offline: 'Çevrimdışı',
};

const freshnessClass: Record<FleetTrip['freshness'], string> = {
  live: 'bg-emerald-100 text-emerald-800',
  delayed: 'bg-amber-100 text-amber-900',
  stale: 'bg-orange-100 text-orange-900',
  offline: 'bg-slate-200 text-slate-700',
};

export default function FleetMapView({ initialTrips }: { initialTrips: FleetTrip[] }) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<Record<string, maplibregl.Marker>>({});
  const [trips, setTrips] = useState(initialTrips);
  const [pollingError, setPollingError] = useState(false);

  useEffect(() => {
    if (!mapContainer.current) return;
    const map = new maplibregl.Map({
      container: mapContainer.current,
      style: 'https://demotiles.maplibre.org/style.json',
      center: [41.9, 37.9],
      zoom: 7,
    });
    map.addControl(new maplibregl.NavigationControl(), 'top-right');
    mapRef.current = map;

    map.on('load', () => {
      initialTrips.forEach((trip, index) => {
        if (!trip.routeGeometry) return;
        const sourceId = `route-${trip.tripId}`;
        map.addSource(sourceId, { type: 'geojson', data: trip.routeGeometry });
        map.addLayer({
          id: sourceId,
          type: 'line',
          source: sourceId,
          paint: {
            'line-color': index === 0 ? '#b91c1c' : '#475569',
            'line-width': index === 0 ? 5 : 3,
            'line-opacity': 0.8,
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
      let marker = markersRef.current[trip.tripId];
      if (!marker) {
        const element = document.createElement('div');
        element.className =
          'grid h-9 w-9 place-items-center rounded-full border-2 border-white bg-red-700 text-lg shadow-lg';
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
        marker = new maplibregl.Marker({ element })
          .setLngLat(point)
          .setPopup(new maplibregl.Popup({ offset: 20 }).setDOMContent(popupContent))
          .addTo(map);
        markersRef.current[trip.tripId] = marker;
      } else {
        marker.setLngLat(point);
      }
    });
  }, [trips]);

  useEffect(() => {
    const refresh = async () => {
      try {
        const response = await fetch('/api/admin/fleet', { cache: 'no-store' });
        if (!response.ok) throw new Error('fleet refresh failed');
        setTrips((await response.json()) as FleetTrip[]);
        setPollingError(false);
      } catch {
        setPollingError(true);
      }
    };
    const timer = window.setInterval(refresh, 5000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.16em] text-red-700">Canlı Filo</p>
          <h1 className="mt-1 text-3xl font-black tracking-tight">Aktif araçlar</h1>
          <p className="mt-1 text-sm text-slate-600">Redis konumu 5 saniyede bir yenilenir.</p>
        </div>
        {pollingError && (
          <p className="rounded-lg bg-amber-100 px-3 py-2 text-sm font-semibold text-amber-900">
            Yenileme gecikti; son bilinen konum gösteriliyor.
          </p>
        )}
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="h-[520px] overflow-hidden rounded-xl border bg-slate-100 shadow-sm">
          <div ref={mapContainer} className="h-full w-full" aria-label="Canlı filo haritası" />
        </div>
        <div className="space-y-3">
          {trips.map((trip) => (
            <article key={trip.tripId} className="rounded-xl border bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-lg font-black">{trip.plateNumber}</p>
                  <p className="text-sm text-slate-600">
                    {trip.originName} → {trip.destinationName}
                  </p>
                </div>
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-bold ${freshnessClass[trip.freshness]}`}
                >
                  {freshnessLabel[trip.freshness]}
                </span>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs text-slate-500">Hız</p>
                  <p className="font-semibold">
                    {trip.latest ? `${Math.round(trip.latest.speedKph)} km/sa` : '—'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Veri yaşı</p>
                  <p className="font-semibold">
                    {trip.ageSeconds === null ? 'Konum yok' : `${trip.ageSeconds} sn`}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Durum</p>
                  <p className="font-semibold">
                    {trip.status === 'in_transit' ? 'Yolda' : 'Biniş'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Varış</p>
                  <p className="font-semibold">
                    {new Date(trip.arrivalTime).toLocaleTimeString('tr-TR', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
              </div>
            </article>
          ))}
          {!trips.length && (
            <div className="rounded-xl border border-dashed bg-white p-6 text-center text-sm text-slate-500">
              Biniş veya yolculuk aşamasında sefer yok.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
