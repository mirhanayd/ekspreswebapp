'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { DriverMap, type DriverMapPosition, type RouteGeometry } from './DriverMap';

type Passenger = {
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

type Stop = {
  id: string;
  locationId: string;
  stopOrder: number;
  estimatedMinutesFromStart: number;
  location: { id: string; name: string; type: string; coordinates?: unknown };
  passengers: Passenger[];
};

type Trip = {
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

type TripSummary = Omit<Trip, 'manifest' | 'latestPosition'> & {
  passengerSummary: { total: number; boarded: number; noShow: number };
};

const statusText: Record<string, string> = {
  scheduled: 'Planlandı',
  boarding: 'Yolcu alımı',
  in_transit: 'Yolda',
  completed: 'Tamamlandı',
};

type ApiError = Error & { status?: number };

const REFRESH_INTERVAL_MS = 20_000;
const LOCATION_INTERVAL_MS = 5_000;

async function api<T>(path: string, init?: RequestInit): Promise<T> {
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

type WakeLockSentinelLike = { release: () => Promise<void> };

function time(value: string) {
  return new Intl.DateTimeFormat('tr-TR', { hour: '2-digit', minute: '2-digit' }).format(
    new Date(value),
  );
}

function date(value: string) {
  return new Intl.DateTimeFormat('tr-TR', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
  }).format(new Date(value));
}

export function DriverDashboard() {
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
        const keep = assigned.find((item) => item.id === currentTripId.current);
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
    void loadRef.current();
    const interval = window.setInterval(() => {
      if (document.visibilityState === 'visible') void loadRef.current(true);
    }, REFRESH_INTERVAL_MS);
    return () => {
      window.clearInterval(interval);
      if (watchId.current !== null && navigator.geolocation)
        navigator.geolocation.clearWatch(watchId.current);
      void wakeLock.current?.release().catch(() => undefined);
    };
  }, []);

  useEffect(() => {
    // Browsers drop the screen wake lock when the tab is hidden; re-acquire on return.
    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        if (sharingTripId.current) void requestWakeLock();
        void loadRef.current(true);
      }
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [requestWakeLock]);

  const counts = useMemo(() => {
    const manifest = trip?.manifest || [];
    return {
      total: manifest.length,
      boarded: manifest.filter((item) => item.boardingStatus === 'boarded').length,
      pending: manifest.filter((item) => item.boardingStatus === 'pending').length,
      noShow: manifest.filter((item) => item.boardingStatus === 'no_show').length,
    };
  }, [trip]);

  async function setTripStatus(status: string) {
    if (!trip || statusBusy || trip.status === status) return;
    if (
      status === 'completed' &&
      !window.confirm('Sefer tamamlansın mı? Canlı konum paylaşımı da kapanacak.')
    ) {
      return;
    }
    setMessage('');
    setNotice('');
    setStatusBusy(true);
    try {
      await api(`trips/${trip.id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) });
      if (status === 'completed' && sharingTripId.current === trip.id) stopLocationSharing();
      await loadTrip(trip.id);
    } catch (error) {
      if (statusOf(error) === 401) return signOutExpired();
      setMessage(messageOf(error, 'Sefer durumu güncellenemedi.'));
    } finally {
      setStatusBusy(false);
    }
  }

  function applyPassengerStatus(ticketId: string, status: Passenger['boardingStatus']) {
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
  }

  async function setPassengerStatus(ticketId: string, status: Passenger['boardingStatus']) {
    if (!trip || busyTickets.has(ticketId)) return;
    const previous = trip.manifest.find((item) => item.ticketId === ticketId)?.boardingStatus;
    setMessage('');
    applyPassengerStatus(ticketId, status);
    setBusyTickets((current) => new Set(current).add(ticketId));
    try {
      await api(`trips/${trip.id}/passengers/${ticketId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
    } catch (error) {
      if (previous) applyPassengerStatus(ticketId, previous);
      if (statusOf(error) === 401) return signOutExpired();
      setMessage(messageOf(error, 'Yolcu durumu güncellenemedi.'));
    } finally {
      setBusyTickets((current) => {
        const next = new Set(current);
        next.delete(ticketId);
        return next;
      });
    }
  }

  function startLocationSharing() {
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
  }

  async function switchTrip(tripId: string) {
    if (sharingTripId.current && sharingTripId.current !== tripId) {
      if (!window.confirm('Konum paylaşımı bu sefer için durdurulacak. Devam edilsin mi?')) return;
      stopLocationSharing();
    }
    setMessage('');
    try {
      await loadTrip(tripId);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error) {
      if (statusOf(error) === 401) return signOutExpired();
      setMessage(messageOf(error, 'Sefer açılamadı.'));
      void load(true);
    }
  }

  async function logout() {
    stopLocationSharing();
    await fetch('/api/auth/logout', { method: 'POST' }).catch(() => undefined);
    window.location.replace('/login');
  }

  if (loading)
    return (
      <main className="app-shell">
        <div className="loading-card">Sürücü paneli hazırlanıyor…</div>
      </main>
    );
  if (!trip) {
    return (
      <main className="app-shell">
        <header className="driver-header">
          <div>
            <p className="eyebrow light">SİİRT KURTALAN EKSPRES</p>
            <h1>Sürücü</h1>
          </div>
          <button className="ghost-button light-button" onClick={logout}>
            Çıkış
          </button>
        </header>
        <section className="empty-card">
          <strong>{message ? 'Seferler yüklenemedi.' : 'Atanmış sefer yok.'}</strong>
          <span>
            {message ||
              notice ||
              'Operasyon ekibinin sefer ataması burada görünecek. Ekran otomatik yenilenir.'}
          </span>
          <button
            className="primary-button compact empty-retry"
            onClick={() => {
              setLoading(true);
              void load();
            }}
          >
            Yenile
          </button>
        </section>
      </main>
    );
  }

  const closed = trip.status === 'completed' || trip.status === 'cancelled';

  return (
    <main className="app-shell">
      <header className="driver-header">
        <div>
          <p className="eyebrow light">SİİRT KURTALAN EKSPRES</p>
          <h1>Sürücü</h1>
        </div>
        <button className="ghost-button light-button" onClick={logout}>
          Çıkış
        </button>
      </header>

      <section className="trip-hero">
        <div className="trip-hero-top">
          <span className={`status-pill status-${trip.status}`}>
            {statusText[trip.status] || trip.status}
          </span>
          <span className="plate">{trip.bus.plateNumber}</span>
        </div>
        <p className="date-line">
          {date(trip.departureTime)} · {time(trip.departureTime)} kalkış
        </p>
        <h2>
          {trip.route.origin.name} <span>→</span> {trip.route.destination.name}
        </h2>
        <p>
          {trip.bus.model || 'Otobüs'} · {time(trip.arrivalTime)} planlanan varış
        </p>
        <div className="status-actions">
          <button
            onClick={() => setTripStatus('boarding')}
            className={trip.status === 'boarding' ? 'active' : ''}
            disabled={statusBusy || trip.status === 'cancelled'}
            aria-pressed={trip.status === 'boarding'}
          >
            Yolcu alımı
          </button>
          <button
            onClick={() => setTripStatus('in_transit')}
            className={trip.status === 'in_transit' ? 'active' : ''}
            disabled={statusBusy || trip.status === 'cancelled'}
            aria-pressed={trip.status === 'in_transit'}
          >
            Yola çık
          </button>
          <button
            onClick={() => setTripStatus('completed')}
            className={trip.status === 'completed' ? 'active' : ''}
            disabled={statusBusy || trip.status === 'cancelled'}
            aria-pressed={trip.status === 'completed'}
          >
            Tamamla
          </button>
        </div>
      </section>

      <DriverMap
        geometry={trip.route.geometry}
        stops={trip.route.stops}
        position={latestPosition}
        sharing={sharing}
      />

      <section className="metric-grid">
        <article>
          <span>Yolcu</span>
          <strong>{counts.total}</strong>
        </article>
        <article>
          <span>Bindi</span>
          <strong>{counts.boarded}</strong>
        </article>
        <article>
          <span>Bekliyor</span>
          <strong>{counts.pending}</strong>
        </article>
        <article>
          <span>Gelmedi</span>
          <strong>{counts.noShow}</strong>
        </article>
      </section>

      <section className={`location-card ${sharing ? 'sharing' : ''}`}>
        <div>
          <p className="eyebrow">CANLI KONUM</p>
          <h3>{sharing ? 'Yolcular sizi canlı görüyor' : 'Konum paylaşımı kapalı'}</h3>
          <p className="muted">
            {sharing
              ? lastLocationAt
                ? `Son gönderim ${time(lastLocationAt)}`
                : 'GPS sinyali bekleniyor…'
              : 'Başlattığınızda konum yalnızca atanmış sefer için paylaşılır.'}
          </p>
        </div>
        <button
          className={sharing ? 'danger-button' : 'primary-button compact'}
          onClick={sharing ? stopLocationSharing : startLocationSharing}
          disabled={!sharing && closed}
        >
          {sharing ? 'Durdur' : closed ? 'Sefer kapalı' : 'Konumu başlat'}
        </button>
      </section>

      {message ? (
        <div className="error-box" role="alert">
          {message}
        </div>
      ) : null}
      {notice ? (
        <div className="notice-box" role="status">
          {notice}
        </div>
      ) : null}

      <section className="section-block">
        <div className="section-heading">
          <div>
            <p className="eyebrow">GÜZERGÂH</p>
            <h3>Durulacak otogarlar</h3>
          </div>
          <span>{trip.route.stops.length} durak</span>
        </div>
        <div className="stop-list">
          {trip.route.stops.map((stop, index) => (
            <article className="stop-card" key={stop.id}>
              <div className="stop-rail">
                <span>{index + 1}</span>
                <i />
              </div>
              <div className="stop-content">
                <div className="stop-title">
                  <div>
                    <strong>{stop.location.name}</strong>
                    <small>+{stop.estimatedMinutesFromStart} dk</small>
                  </div>
                  <span className="passenger-count">{stop.passengers.length} binecek</span>
                </div>
                {stop.passengers.length > 0 ? (
                  <div className="stop-passengers">
                    {stop.passengers.map((passenger) => (
                      <PassengerRow
                        passenger={passenger}
                        key={passenger.ticketId}
                        onStatus={setPassengerStatus}
                        busy={busyTickets.has(passenger.ticketId)}
                      />
                    ))}
                  </div>
                ) : (
                  <p className="no-passenger">Bu durakta binecek kayıtlı yolcu yok.</p>
                )}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="section-block passenger-all">
        <div className="section-heading">
          <div>
            <p className="eyebrow">MANİFESTO</p>
            <h3>Tüm yolcular</h3>
          </div>
          <span>{counts.total} kişi</span>
        </div>
        <div className="manifest-list">
          {!trip.manifest.length ? (
            <p className="no-passenger">Bu sefer için satılmış bilet yok.</p>
          ) : null}
          {trip.manifest.map((passenger) => (
            <PassengerRow
              passenger={passenger}
              key={passenger.ticketId}
              onStatus={setPassengerStatus}
              busy={busyTickets.has(passenger.ticketId)}
            />
          ))}
        </div>
      </section>

      {trips.length > 1 ? (
        <section className="section-block other-trips">
          <div className="section-heading">
            <div>
              <p className="eyebrow">SEFERLER</p>
              <h3>Diğer atamalar</h3>
            </div>
          </div>
          {trips
            .filter((item) => item.id !== trip.id)
            .map((item) => (
              <button className="trip-switcher" key={item.id} onClick={() => switchTrip(item.id)}>
                <span>
                  {date(item.departureTime)} · {time(item.departureTime)}
                </span>
                <strong>{item.route.name}</strong>
                <small>{statusText[item.status] || item.status}</small>
              </button>
            ))}
        </section>
      ) : null}
    </main>
  );
}

function PassengerRow({
  passenger,
  onStatus,
  busy,
}: {
  passenger: Passenger;
  onStatus: (ticketId: string, status: Passenger['boardingStatus']) => Promise<void>;
  busy: boolean;
}) {
  return (
    <div className="passenger-row">
      <div className="seat-box">{passenger.seatNo}</div>
      <div className="passenger-main">
        <strong>
          {passenger.firstName} {passenger.lastName}
        </strong>
        <span>{passenger.phone || passenger.email || passenger.ticketNo}</span>
      </div>
      {passenger.phone ? (
        <a
          className="phone-button"
          href={`tel:${passenger.phone.replace(/\s/g, '')}`}
          aria-label={`${passenger.firstName} adlı yolcuyu ara`}
        >
          Ara
        </a>
      ) : null}
      <select
        value={passenger.boardingStatus}
        onChange={(event) =>
          void onStatus(passenger.ticketId, event.target.value as Passenger['boardingStatus'])
        }
        aria-label={`${passenger.firstName} ${passenger.lastName} biniş durumu`}
        disabled={busy}
      >
        <option value="pending">Bekliyor</option>
        <option value="boarded">Bindi</option>
        <option value="no_show">Gelmedi</option>
      </select>
    </div>
  );
}
