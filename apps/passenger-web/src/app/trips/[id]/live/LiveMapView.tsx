'use client';
import { useEffect, useRef, useState } from 'react';
import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { io, Socket } from 'socket.io-client';
import { Bus, MapPin, ChevronLeft } from 'lucide-react';
import Link from 'next/link';

export default function LiveMapView({ trip, ticketId }: { trip: any; ticketId?: string }) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const markerRef = useRef<maplibregl.Marker | null>(null);

  const [eta, setEta] = useState<string>('Hesaplanıyor...');
  const [speed, setSpeed] = useState<number>(0);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!mapContainer.current) return;

    const originCoords = trip.route.origin.coordinates.coordinates;
    const destCoords = trip.route.destination.coordinates.coordinates;

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: `https://api.maptiler.com/maps/streets-v2/style.json?key=get_your_own_OpIi9ZULNHzrESv6T2vL`, // Using a demo public map style
      center: originCoords,
      zoom: 8,
    });

    map.current.on('load', () => {
      // Add origin and destination markers
      new maplibregl.Marker({ color: '#3b82f6' })
        .setLngLat(originCoords)
        .setPopup(new maplibregl.Popup().setText(trip.route.origin.name))
        .addTo(map.current!);

      new maplibregl.Marker({ color: '#ef4444' })
        .setLngLat(destCoords)
        .setPopup(new maplibregl.Popup().setText(trip.route.destination.name))
        .addTo(map.current!);

      // Bus marker (will be updated)
      const el = document.createElement('div');
      el.className = 'bus-marker';
      el.style.width = '32px';
      el.style.height = '32px';
      el.style.backgroundImage = `url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="%233b82f6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-bus-front"><rect width="16" height="16" x="4" y="3" rx="2"/><path d="M4 11h16"/><path d="M12 3v8"/><path d="m8 19-2 3"/><path d="m18 22-2-3"/><path d="M8 15h.01"/><path d="M16 15h.01"/></svg>')`;
      el.style.backgroundColor = 'white';
      el.style.borderRadius = '50%';
      el.style.boxShadow = '0 2px 4px rgba(0,0,0,0.2)';

      markerRef.current = new maplibregl.Marker({ element: el })
        .setLngLat(originCoords) // initial
        .addTo(map.current!);

      // Connect to WebSocket
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';
      // extract base url
      const wsUrl = new URL(apiUrl).origin;

      socketRef.current = io(wsUrl, {
        path: '/api/tracking',
        transports: ['websocket'],
      });

      socketRef.current.on('connect', () => {
        setConnected(true);
        socketRef.current?.emit('subscribe_trip', trip.id);
      });

      socketRef.current.on('disconnect', () => {
        setConnected(false);
      });

      socketRef.current.on('location_update', (data: any) => {
        if (markerRef.current) {
          markerRef.current.setLngLat([data.lng, data.lat]);

          // Smoothly pan map to bus if we want
          // map.current?.panTo([data.lng, data.lat], { duration: 1000 });
        }
        if (data.speed !== undefined) setSpeed(data.speed);

        // Very rough ETA calculation for demo
        const dx = destCoords[0] - data.lng;
        const dy = destCoords[1] - data.lat;
        const dist = Math.sqrt(dx * dx + dy * dy) * 111; // rough km
        const spd = data.speed || 80;
        const hrs = dist / spd;
        if (hrs < 0.1) setEta('Yaklaşıyor');
        else setEta(`~${Math.round(hrs * 60)} dk`);
      });
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
      if (map.current) {
        map.current.remove();
      }
    };
  }, [trip]);

  return (
    <div className="relative h-screen w-full flex flex-col">
      {/* Header Overlay */}
      <div className="absolute top-0 left-0 right-0 z-10 p-4">
        <div className="bg-white/90 backdrop-blur-md rounded-2xl shadow-lg p-4 flex items-center justify-between">
          <Link
            href={`/tickets/${ticketId || ''}`}
            className="text-gray-500 hover:text-gray-900 bg-gray-100 p-2 rounded-full"
          >
            <ChevronLeft className="h-5 w-5" />
          </Link>
          <div className="text-center">
            <h1 className="font-bold text-gray-900">
              {trip.route.origin.name} → {trip.route.destination.name}
            </h1>
            <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
              <span
                className={`inline-block w-2 h-2 rounded-full ${connected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}
              ></span>
              {connected ? 'Canlı Takip Aktif' : 'Bağlantı Bekleniyor...'}
            </div>
          </div>
          <div className="w-9"></div>
        </div>
      </div>

      {/* Map Container */}
      <div ref={mapContainer} className="flex-1 w-full" />

      {/* Bottom Info Overlay */}
      <div className="absolute bottom-8 left-4 right-4 z-10">
        <div className="bg-white rounded-2xl shadow-xl p-4 border border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="bg-blue-100 text-blue-600 p-3 rounded-full">
              <Bus className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Tahmini Varış</p>
              <p className="text-xl font-bold text-gray-900">{eta}</p>
            </div>
          </div>

          <div className="text-right">
            <p className="text-sm text-gray-500">Hız</p>
            <p className="text-xl font-bold text-gray-900">
              {speed} <span className="text-sm font-normal">km/s</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
