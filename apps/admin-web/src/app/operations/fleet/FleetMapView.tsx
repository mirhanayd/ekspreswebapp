'use client';
import { useEffect, useRef, useState } from 'react';
import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { io, Socket } from 'socket.io-client';

export default function FleetMapView({ initialTrips }: { initialTrips: any[] }) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const socketRef = useRef<Socket | null>(null);

  // Keep track of markers by tripId
  const markersRef = useRef<{ [key: string]: maplibregl.Marker }>({});

  useEffect(() => {
    if (!mapContainer.current) return;

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: `https://api.maptiler.com/maps/streets-v2/style.json?key=get_your_own_OpIi9ZULNHzrESv6T2vL`,
      center: [39.9208, 32.8541], // Turkey center
      zoom: 5,
    });

    map.current.on('load', () => {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';
      const wsUrl = new URL(apiUrl).origin;

      socketRef.current = io(wsUrl, {
        path: '/api/tracking',
        transports: ['websocket'],
      });

      socketRef.current.on('connect', () => {
        // Subscribe to all active trips
        initialTrips.forEach((trip) => {
          if (trip.status === 'in_transit') {
            socketRef.current?.emit('subscribe_trip', trip.id);
          }
        });
      });

      socketRef.current.on('location_update', (data: any) => {
        const { tripId, lng, lat } = data;

        let marker = markersRef.current[tripId];
        if (!marker) {
          // Create marker
          const el = document.createElement('div');
          el.className = 'fleet-bus-marker';
          el.style.width = '24px';
          el.style.height = '24px';
          el.style.backgroundColor = '#2563eb';
          el.style.borderRadius = '50%';
          el.style.border = '2px solid white';
          el.style.boxShadow = '0 2px 4px rgba(0,0,0,0.3)';

          // Popup with trip info
          const popup = new maplibregl.Popup({ offset: 15 }).setHTML(`
            <div class="text-sm">
              <strong>Sefer ID:</strong> ${tripId.substring(0, 8)}...<br/>
              <strong>Hız:</strong> ${data.speed || 80} km/s
            </div>
          `);

          marker = new maplibregl.Marker({ element: el })
            .setLngLat([lng, lat])
            .setPopup(popup)
            .addTo(map.current!);

          markersRef.current[tripId] = marker;
        } else {
          marker.setLngLat([lng, lat]);
        }
      });
    });

    return () => {
      if (socketRef.current) socketRef.current.disconnect();
      if (map.current) map.current.remove();
    };
  }, [initialTrips]);

  return (
    <div className="flex flex-col gap-4 h-[calc(100vh-100px)]">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Filo Haritası</h2>
        <p className="text-muted-foreground">
          Aktif seferleri harita üzerinde gerçek zamanlı izleyin.
        </p>
      </div>
      <div className="flex-1 rounded-xl overflow-hidden border">
        <div ref={mapContainer} className="w-full h-full" />
      </div>
    </div>
  );
}
