'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { usePathname } from 'next/navigation';
import type { SeatLayoutItem } from '@/lib/seat-plan';

export type RouteGeometry = { type: 'LineString'; coordinates: Array<[number, number]> };

export type DriverMapPosition = {
  longitude: number;
  latitude: number;
  speedKph: number;
  headingDeg: number;
  recordedAt: string;
};

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
  boardingStatus: 'pending' | 'boarded' | 'alighted' | 'no_show';
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
  bus: {
    id: string;
    plateNumber: string;
    model: string | null;
    totalSeats?: number | null;
    seatLayout?: { layout?: string; items?: SeatLayoutItem[] } | null;
  };
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

export type DriverIdentity = { firstName: string; lastName: string; email: string };

type DriverContextValue = {
  driver: DriverIdentity | null;
  trips: TripSummary[];
  trip: Trip | null;
  loading: boolean;
  message: string;
  notice: string;
  sharing: boolean;
  statusBusy: boolean;
  busyTickets: Set<string>;
  lastLocationAt: string | null;
  latestPosition: DriverMapPosition | null;
  counts: { total: number; boarded: number; alighted: number; pending: number; noShow: number };
  // eslint-disable-next-line no-unused-vars
  switchTrip: (tripId: string) => Promise<void>;
  // eslint-disable-next-line no-unused-vars
  setTripStatus: (status: string) => Promise<boolean>;
  // eslint-disable-next-line no-unused-vars
  setPassengerStatus: (ticketId: string, status: Passenger['boardingStatus']) => Promise<boolean>;
  startLocationSharing: () => void;
  stopLocationSharing: () => void;
  reload: () => void;
  logout: () => Promise<void>;
};

const DriverContext = createContext<DriverContextValue | null>(null);

type ApiError = Error & { status?: number };
type WakeLockSentinelLike = { release: () => Promise<void> };

const REFRESH_INTERVAL_MS = 20_000;
const LOCATION_INTERVAL_MS = 5_000;

async function api<T>(path: string, init?: Parameters<typeof fetch>[1]): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`/api/driver/${path}`, {
      ...init,
      headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) },
      cache: 'no-store',
    });
  } catch {
    throw Object.assign(new Error('Bağlantı yok. İnternet gelince tekrar denenecek.'), {
      status: 0,
    });
  }
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw Object.assign(new Error(body.message || 'İşlem tamamlanamadı.'), {
      status: response.status,
    });
  }
  return response.json();
}

function statusOf(error: unknown) {
  return (error as ApiError | undefined)?.status;
}

function messageOf(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

/** Pick the trip a driver most likely needs now: live → next upcoming → most recent. */
function preferredTrip(trips: TripSummary[]) {
  const live = trips.find((item) => item.status === 'in_transit' || item.status === 'boarding');
  if (live) return live;
  const open = trips.filter((item) => item.status === 'scheduled');
  const now = Date.now();
  const upcoming = open.find((item) => new Date(item.arrivalTime).getTime() >= now);
  return upcoming || open[open.length - 1] || trips[trips.length - 1];
}

export function DriverProvider({
  children,
  driver = null,
}: Readonly<{ children: React.ReactNode; driver?: DriverIdentity | null }>) {
  const pathname = usePathname();
  const [trips, setTrips] = useState<TripSummary[]>([]);
  const [trip, setTrip] = useState<Trip | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [notice, setNotice] = useState('');
  const [sharing, setSharing] = useState(false);
  const [statusBusy, setStatusBusy] = useState(false);
  const [busyTickets, setBusyTickets] = useState<Set<string>>(() => new Set());
  const [lastLocationAt, setLastLocationAt] = useState<string | null>(null);
  const [latestPosition, setLatestPosition] = useState<DriverMapPosition | null>(null);
  const watchId = useRef<number | null>(null);
  const lastSentAt = useRef(0);
  const sharingTripId = useRef<string | null>(null);
  const currentTripId = useRef<string | null>(null);
  const wakeLock = useRef<WakeLockSentinelLike | null>(null);
  const isLogin = pathname === '/login';

  const signOutExpired = useCallback(() => {
    // GET clears the httpOnly cookie server-side, so middleware cannot bounce back to '/'.
    window.location.replace('/api/auth/logout');
  }, []);

  const releaseWakeLock = useCallback(() => {
    void wakeLock.current?.release().catch(() => undefined);
    wakeLock.current = null;
  }, []);

  const requestWakeLock = useCallback(async () => {
    const nav = navigator as Navigator & {
      // eslint-disable-next-line no-unused-vars
      wakeLock?: { request: (...args: ['screen']) => Promise<WakeLockSentinelLike> };
    };
    if (!nav.wakeLock || wakeLock.current) return;
    try {
      wakeLock.current = await nav.wakeLock.request('screen');
    } catch {
      wakeLock.current = null;
    }
  }, []);

  const stopLocationSharing = useCallback(() => {
    if (watchId.current !== null && typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchId.current);
    }
    watchId.current = null;
    sharingTripId.current = null;
    setSharing(false);
    releaseWakeLock();
  }, [releaseWakeLock]);

  const loadTrip = useCallback(async (tripId: string) => {
    const detail = await api<Trip>(`trips/${tripId}`);
    currentTripId.current = detail.id;
    setTrip(detail);
    setLatestPosition((current) =>
      sharingTripId.current === detail.id && current ? current : detail.latestPosition,
    );
    return detail;
  }, []);

  const load = useCallback(
    async (background = false) => {
      try {
        const assigned = await api<TripSummary[]>('trips');
        setTrips(assigned);
        // A finished trip gives way to the next one instead of staying on the Today card.
        const keep = assigned.find(
          (item) => item.id === currentTripId.current && item.status !== 'completed',
        );
        const target = keep || preferredTrip(assigned);
        if (!target) {
          const hadTrip = currentTripId.current !== null;
          if (sharingTripId.current) stopLocationSharing();
          currentTripId.current = null;
          setTrip(null);
          if (hadTrip) setNotice('Sefer ataması kaldırıldı.');
          return;
        }
        if (!keep && currentTripId.current && sharingTripId.current) {
          stopLocationSharing();
          setNotice('Önceki sefer artık size atanmış değil; konum paylaşımı durduruldu.');
        }
        await loadTrip(target.id);
        if (!background) setMessage('');
      } catch (error) {
        const status = statusOf(error);
        if (status === 401 || (status === 403 && !currentTripId.current)) {
          stopLocationSharing();
          signOutExpired();
          return;
        }
        // Background refresh failures (e.g. weak signal) must not wipe a working screen.
        if (!background || status !== 0) {
          setMessage(messageOf(error, 'Seferler yüklenemedi.'));
        }
      } finally {
        setLoading(false);
      }
    },
    [loadTrip, signOutExpired, stopLocationSharing],
  );

  const loadRef = useRef(load);
  loadRef.current = load;

  useEffect(() => {
    if (isLogin) return;
    void loadRef.current();
    const interval = window.setInterval(() => {
      if (document.visibilityState === 'visible') void loadRef.current(true);
    }, REFRESH_INTERVAL_MS);
    return () => window.clearInterval(interval);
  }, [isLogin]);

  useEffect(
    () => () => {
      if (watchId.current !== null && navigator.geolocation)
        navigator.geolocation.clearWatch(watchId.current);
      void wakeLock.current?.release().catch(() => undefined);
    },
    [],
  );

  useEffect(() => {
    if (isLogin) return;
    // Browsers drop the screen wake lock when the tab is hidden; re-acquire on return.
    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        if (sharingTripId.current) void requestWakeLock();
        void loadRef.current(true);
      }
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [isLogin, requestWakeLock]);

  const counts = useMemo(() => {
    const manifest = trip?.manifest || [];
    return {
      total: manifest.length,
      boarded: manifest.filter((item) => item.boardingStatus === 'boarded').length,
      alighted: manifest.filter((item) => item.boardingStatus === 'alighted').length,
      pending: manifest.filter((item) => item.boardingStatus === 'pending').length,
      noShow: manifest.filter((item) => item.boardingStatus === 'no_show').length,
    };
  }, [trip]);

  const setTripStatus = useCallback(
    async (status: string) => {
      if (!trip || statusBusy) return false;
      if (trip.status === status) return true;
      setMessage('');
      setNotice('');
      setStatusBusy(true);
      try {
        await api(`trips/${trip.id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) });
        if (status === 'completed' && sharingTripId.current === trip.id) stopLocationSharing();
        await (status === 'completed' ? loadRef.current(true) : loadTrip(trip.id));
        return true;
      } catch (error) {
        if (statusOf(error) === 401) signOutExpired();
        else setMessage(messageOf(error, 'Sefer durumu güncellenemedi.'));
        return false;
      } finally {
        setStatusBusy(false);
      }
    },
    [loadTrip, signOutExpired, statusBusy, stopLocationSharing, trip],
  );

  const applyPassengerStatus = useCallback(
    (ticketId: string, status: Passenger['boardingStatus']) => {
      setTrip((current) => {
        if (!current) return current;
        const patch = (passenger: Passenger) =>
          passenger.ticketId === ticketId ? { ...passenger, boardingStatus: status } : passenger;
        return {
          ...current,
          manifest: current.manifest.map(patch),
          route: {
            ...current.route,
            stops: current.route.stops.map((stop) => ({
              ...stop,
              passengers: stop.passengers.map(patch),
            })),
          },
        };
      });
    },
    [],
  );

  const setPassengerStatus = useCallback(
    async (ticketId: string, status: Passenger['boardingStatus']) => {
      if (!trip || busyTickets.has(ticketId)) return false;
      const previous = trip.manifest.find((item) => item.ticketId === ticketId)?.boardingStatus;
      setMessage('');
      applyPassengerStatus(ticketId, status);
      setBusyTickets((current) => new Set(current).add(ticketId));
      try {
        await api(`trips/${trip.id}/passengers/${ticketId}`, {
          method: 'PATCH',
          body: JSON.stringify({ status }),
        });
        return true;
      } catch (error) {
        if (previous) applyPassengerStatus(ticketId, previous);
        if (statusOf(error) === 401) signOutExpired();
        else setMessage(messageOf(error, 'Yolcu durumu güncellenemedi.'));
        return false;
      } finally {
        setBusyTickets((current) => {
          const next = new Set(current);
          next.delete(ticketId);
          return next;
        });
      }
    },
    [applyPassengerStatus, busyTickets, signOutExpired, trip],
  );

  const startLocationSharing = useCallback(() => {
    if (!trip || watchId.current !== null) return;
    if (trip.status === 'completed' || trip.status === 'cancelled') {
      setMessage('Kapanmış sefer için konum paylaşılamaz.');
      return;
    }
    if (!navigator.geolocation) {
      setMessage('Bu cihaz konum paylaşımını desteklemiyor.');
      return;
    }
    if (!window.isSecureContext) {
      setMessage('Konum paylaşımı için uygulamayı https bağlantısıyla açın.');
      return;
    }
    setMessage('');
    setNotice('');
    const tripId = trip.id;
    sharingTripId.current = tripId;
    lastSentAt.current = 0;
    setLastLocationAt(null);
    watchId.current = navigator.geolocation.watchPosition(
      (position) => {
        // The trip id is captured per sharing session so switching trips can never leak GPS.
        if (sharingTripId.current !== tripId) return;
        const now = Date.now();
        if (now - lastSentAt.current < LOCATION_INTERVAL_MS) return;
        lastSentAt.current = now;
        const speedKph = Math.min(180, Math.max(0, (position.coords.speed || 0) * 3.6));
        const heading = position.coords.heading;
        void api<DriverMapPosition>(`trips/${tripId}/location`, {
          method: 'POST',
          body: JSON.stringify({
            longitude: position.coords.longitude,
            latitude: position.coords.latitude,
            speedKph,
            headingDeg: typeof heading === 'number' && Number.isFinite(heading) ? heading % 360 : 0,
            recordedAt: new Date(position.timestamp).toISOString(),
          }),
        })
          .then((nextPosition) => {
            if (sharingTripId.current !== tripId) return;
            setMessage('');
            setLastLocationAt(new Date().toISOString());
            setLatestPosition(nextPosition);
          })
          .catch((error) => {
            const status = statusOf(error);
            if (status === 401) {
              stopLocationSharing();
              signOutExpired();
              return;
            }
            if (status === 403 || status === 409) {
              stopLocationSharing();
              void loadRef.current(true);
            }
            setMessage(messageOf(error, 'Konum gönderilemedi.'));
          });
      },
      (error) => {
        if (error.code === error.PERMISSION_DENIED) {
          setMessage('Konum izni verilmedi. Canlı takip için tarayıcı konum iznini açın.');
          stopLocationSharing();
          return;
        }
        // Timeouts / weak signal are transient; keep the watch alive and just inform.
        setMessage('GPS sinyali zayıf, konum bekleniyor…');
      },
      { enableHighAccuracy: true, maximumAge: 3000, timeout: 20000 },
    );
    setSharing(true);
    void requestWakeLock();
  }, [requestWakeLock, signOutExpired, stopLocationSharing, trip]);

  const switchTrip = useCallback(
    async (tripId: string) => {
      if (sharingTripId.current && sharingTripId.current !== tripId) {
        if (!window.confirm('Konum paylaşımı bu sefer için durdurulacak. Devam edilsin mi?'))
          return;
        stopLocationSharing();
      }
      setMessage('');
      try {
        await loadTrip(tripId);
      } catch (error) {
        if (statusOf(error) === 401) return signOutExpired();
        setMessage(messageOf(error, 'Sefer açılamadı.'));
        void loadRef.current(true);
      }
    },
    [loadTrip, signOutExpired, stopLocationSharing],
  );

  const reload = useCallback(() => {
    setLoading(true);
    void loadRef.current();
  }, []);

  const logout = useCallback(async () => {
    stopLocationSharing();
    await fetch('/api/auth/logout', { method: 'POST' }).catch(() => undefined);
    window.location.replace('/login');
  }, [stopLocationSharing]);

  const value = useMemo(
    () => ({
      driver,
      trips,
      trip,
      loading,
      message,
      notice,
      sharing,
      statusBusy,
      busyTickets,
      lastLocationAt,
      latestPosition,
      counts,
      switchTrip,
      setTripStatus,
      setPassengerStatus,
      startLocationSharing,
      stopLocationSharing,
      reload,
      logout,
    }),
    [
      busyTickets,
      counts,
      driver,
      lastLocationAt,
      latestPosition,
      loading,
      logout,
      message,
      notice,
      reload,
      setPassengerStatus,
      setTripStatus,
      sharing,
      startLocationSharing,
      statusBusy,
      stopLocationSharing,
      switchTrip,
      trip,
      trips,
    ],
  );

  return <DriverContext.Provider value={value}>{children}</DriverContext.Provider>;
}

export function useDriver() {
  const context = useContext(DriverContext);
  if (!context) throw new Error('useDriver must be used inside DriverProvider');
  return context;
}
