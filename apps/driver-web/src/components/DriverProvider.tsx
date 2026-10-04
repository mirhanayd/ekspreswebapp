'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import type { DriverMapPosition, RouteGeometry } from './DriverMap';

export type Passenger = {
  ticketId: string;
  ticketNo: string;
  seatNo: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  email: string | null;
  boardingLocationId: string | null;
  alightingLocationId: string | null;
  boardingStatus: 'pending' | 'boarded' | 'no_show';
};

export type Stop = {
  id: string;
  locationId: string;
  stopOrder: number;
  estimatedMinutesFromStart: number;
  location: { id: string; name: string; type: string; coordinates?: unknown };
  passengers: Passenger[];
};

export type Trip = {
  id: string;
  status: string;
  departureTime: string;
  arrivalTime: string;
  bus: { id: string; plateNumber: string; model: string | null };
  route: {
    id: string;
    name: string;
    originId: string;
    destinationId: string;
    origin: { id: string; name: string };
    destination: { id: string; name: string };
    geometry: RouteGeometry | null;
    stops: Stop[];
  };
  manifest: Passenger[];
  latestPosition: DriverMapPosition | null;
};

export type TripSummary = Omit<Trip, 'manifest' | 'latestPosition'> & {
  passengerSummary: { total: number; boarded: number; noShow: number };
};

type DriverContextValue = {
  trips: TripSummary[];
  trip: Trip | null;
  loading: boolean;
  message: string;
  sharing: boolean;
  lastLocationAt: string | null;
  latestPosition: DriverMapPosition | null;
  counts: { total: number; boarded: number; pending: number; noShow: number };
  nextStop: Stop | null;
  // eslint-disable-next-line no-unused-vars
  loadTrip: (tripId: string) => Promise<void>;
  // eslint-disable-next-line no-unused-vars
  setTripStatus: (status: string) => Promise<void>;
  // eslint-disable-next-line no-unused-vars
  setPassengerStatus: (ticketId: string, status: Passenger['boardingStatus']) => Promise<void>;
  startLocationSharing: () => void;
  stopLocationSharing: () => void;
  logout: () => Promise<void>;
};

const DriverContext = createContext<DriverContextValue | null>(null);

async function api<T>(path: string, init?: Parameters<typeof fetch>[1]): Promise<T> {
  const response = await fetch(`/api/driver/${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) },
    cache: 'no-store',
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw Object.assign(new Error(body.message || 'İşlem tamamlanamadı.'), { status: response.status });
  }
  return response.json();
}

export function DriverProvider({ children }: Readonly<{ children: React.ReactNode }>) {
  const pathname = usePathname();
  const router = useRouter();
  const [trips, setTrips] = useState<TripSummary[]>([]);
  const [trip, setTrip] = useState<Trip | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [sharing, setSharing] = useState(false);
  const [lastLocationAt, setLastLocationAt] = useState<string | null>(null);
  const [latestPosition, setLatestPosition] = useState<DriverMapPosition | null>(null);
  const watchId = useRef<number | null>(null);
  const lastSentAt = useRef(0);
  const loaded = useRef(false);

  const loadTrip = useCallback(async (tripId: string) => {
    const detail = await api<Trip>(`trips/${tripId}`);
    setTrip(detail);
    setLatestPosition(detail.latestPosition);
  }, []);

  const load = useCallback(async () => {
    try {
      const assigned = await api<TripSummary[]>('trips');
      setTrips(assigned);
      const preferred =
        assigned.find((item) => item.status === 'in_transit' || item.status === 'boarding') ||
        assigned[0];
      if (preferred) await loadTrip(preferred.id);
      loaded.current = true;
    } catch (error) {
      if ((error as { status?: number }).status === 401 || (error as { status?: number }).status === 403) {
        router.replace('/login');
        return;
      }
      setMessage(error instanceof Error ? error.message : 'Seferler yüklenemedi.');
      loaded.current = true;
    } finally {
      setLoading(false);
    }
  }, [loadTrip, router]);

  useEffect(() => {
    if (pathname !== '/login' && !loaded.current) void load();
  }, [load, pathname]);

  useEffect(() => () => {
    if (watchId.current !== null && navigator.geolocation) navigator.geolocation.clearWatch(watchId.current);
  }, []);

  const counts = useMemo(() => {
    const manifest = trip?.manifest || [];
    return {
      total: manifest.length,
      boarded: manifest.filter((item) => item.boardingStatus === 'boarded').length,
      pending: manifest.filter((item) => item.boardingStatus === 'pending').length,
      noShow: manifest.filter((item) => item.boardingStatus === 'no_show').length,
    };
  }, [trip]);

  const nextStop = useMemo(() => {
    if (!trip) return null;
    return trip.route.stops.find((stop) => stop.passengers.some((passenger) => passenger.boardingStatus === 'pending')) || trip.route.stops[0] || null;
  }, [trip]);

  const setTripStatus = useCallback(async (status: string) => {
    if (!trip) return;
    setMessage('');
    try {
      await api(`trips/${trip.id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) });
      await loadTrip(trip.id);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Sefer durumu güncellenemedi.');
    }
  }, [loadTrip, trip]);

  const setPassengerStatus = useCallback(async (ticketId: string, status: Passenger['boardingStatus']) => {
    if (!trip) return;
    setMessage('');
    try {
      await api(`trips/${trip.id}/passengers/${ticketId}`, { method: 'PATCH', body: JSON.stringify({ status }) });
      await loadTrip(trip.id);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Yolcu durumu güncellenemedi.');
    }
  }, [loadTrip, trip]);

  const stopLocationSharing = useCallback(() => {
    if (watchId.current !== null) navigator.geolocation.clearWatch(watchId.current);
    watchId.current = null;
    setSharing(false);
  }, []);

  const startLocationSharing = useCallback(() => {
    if (!trip) return;
    if (!navigator.geolocation) {
      setMessage('Bu cihaz konum paylaşımını desteklemiyor.');
      return;
    }
    setMessage('');
    watchId.current = navigator.geolocation.watchPosition(
      (position) => {
        const now = Date.now();
        if (now - lastSentAt.current < 5000) return;
        lastSentAt.current = now;
        void api<DriverMapPosition>(`trips/${trip.id}/location`, {
          method: 'POST',
          body: JSON.stringify({
            longitude: position.coords.longitude,
            latitude: position.coords.latitude,
            speedKph: Math.max(0, (position.coords.speed || 0) * 3.6),
            headingDeg: position.coords.heading || 0,
            recordedAt: new Date(position.timestamp).toISOString(),
          }),
        }).then((nextPosition) => {
          setLastLocationAt(new Date().toISOString());
          setLatestPosition(nextPosition);
        }).catch((error) => setMessage(error instanceof Error ? error.message : 'Konum gönderilemedi.'));
      },
      (error) => {
        setMessage(error.code === error.PERMISSION_DENIED ? 'Konum izni verilmedi. Canlı takip için tarayıcı konum iznini açın.' : 'Cihaz konumu alınamadı.');
        stopLocationSharing();
      },
      { enableHighAccuracy: true, maximumAge: 3000, timeout: 12000 },
    );
    setSharing(true);
  }, [stopLocationSharing, trip]);

  const logout = useCallback(async () => {
    stopLocationSharing();
    await fetch('/api/auth/logout', { method: 'POST' });
    loaded.current = false;
    setTrips([]);
    setTrip(null);
    setLoading(true);
    router.replace('/login');
  }, [router, stopLocationSharing]);

  const value = useMemo(() => ({
    trips, trip, loading, message, sharing, lastLocationAt, latestPosition, counts, nextStop,
    loadTrip, setTripStatus, setPassengerStatus, startLocationSharing, stopLocationSharing, logout,
  }), [counts, lastLocationAt, loadTrip, loading, logout, message, nextStop, latestPosition, setPassengerStatus, setTripStatus, sharing, startLocationSharing, stopLocationSharing, trip, trips]);

  return <DriverContext.Provider value={value}>{children}</DriverContext.Provider>;
}

export function useDriver() {
  const context = useContext(DriverContext);
  if (!context) throw new Error('useDriver must be used inside DriverProvider');
  return context;
}
