'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

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
  location: { id: string; name: string; type: string };
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
    stops: Stop[];
  };
  manifest: Passenger[];
};

type TripSummary = Omit<Trip, 'manifest'> & {
  passengerSummary: { total: number; boarded: number; noShow: number };
};

const statusText: Record<string, string> = {
  scheduled: 'Planlandı',
  boarding: 'Yolcu alımı',
  in_transit: 'Yolda',
  completed: 'Tamamlandı',
};

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`/api/driver/${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) },
    cache: 'no-store',
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw Object.assign(new Error(body.message || 'İşlem tamamlanamadı.'), {
      status: response.status,
    });
  }
  return response.json();
}

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
  const router = useRouter();
  const [trips, setTrips] = useState<TripSummary[]>([]);
  const [trip, setTrip] = useState<Trip | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [sharing, setSharing] = useState(false);
  const [lastLocationAt, setLastLocationAt] = useState<string | null>(null);
  const watchId = useRef<number | null>(null);
  const lastSentAt = useRef(0);

  const loadTrip = useCallback(async (tripId: string) => {
    const detail = await api<Trip>(`trips/${tripId}`);
    setTrip(detail);
  }, []);

  const load = useCallback(async () => {
    try {
      const assigned = await api<TripSummary[]>('trips');
      setTrips(assigned);
      const preferred =
        assigned.find((item) => item.status === 'in_transit' || item.status === 'boarding') ||
        assigned[0];
      if (preferred) await loadTrip(preferred.id);
    } catch (error) {
      if (
        (error as { status?: number }).status === 401 ||
        (error as { status?: number }).status === 403
      ) {
        router.replace('/login');
        return;
      }
      setMessage(error instanceof Error ? error.message : 'Seferler yüklenemedi.');
    } finally {
      setLoading(false);
    }
  }, [loadTrip, router]);

  useEffect(() => {
    void load();
    return () => {
      if (watchId.current !== null && navigator.geolocation)
        navigator.geolocation.clearWatch(watchId.current);
    };
  }, [load]);

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
    if (!trip) return;
    setMessage('');
    try {
      await api(`trips/${trip.id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) });
      await loadTrip(trip.id);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Sefer durumu güncellenemedi.');
    }
  }

  async function setPassengerStatus(ticketId: string, status: Passenger['boardingStatus']) {
    if (!trip) return;
    setMessage('');
    try {
      await api(`trips/${trip.id}/passengers/${ticketId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      await loadTrip(trip.id);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Yolcu durumu güncellenemedi.');
    }
  }

  function stopLocationSharing() {
    if (watchId.current !== null) navigator.geolocation.clearWatch(watchId.current);
    watchId.current = null;
    setSharing(false);
  }

  function startLocationSharing() {
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
        const speedKph = Math.max(0, (position.coords.speed || 0) * 3.6);
        void api(`trips/${trip.id}/location`, {
          method: 'POST',
          body: JSON.stringify({
            longitude: position.coords.longitude,
            latitude: position.coords.latitude,
            speedKph,
            headingDeg: position.coords.heading || 0,
            recordedAt: new Date(position.timestamp).toISOString(),
          }),
        })
          .then(() => setLastLocationAt(new Date().toISOString()))
          .catch((error) =>
            setMessage(error instanceof Error ? error.message : 'Konum gönderilemedi.'),
          );
      },
      (error) => {
        setMessage(
          error.code === error.PERMISSION_DENIED
            ? 'Konum izni verilmedi. Canlı takip için tarayıcı konum iznini açın.'
            : 'Cihaz konumu alınamadı.',
        );
        stopLocationSharing();
      },
      { enableHighAccuracy: true, maximumAge: 3000, timeout: 12000 },
    );
    setSharing(true);
  }

  async function logout() {
    stopLocationSharing();
    await fetch('/api/auth/logout', { method: 'POST' });
    router.replace('/login');
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
        <section className="empty-card">
          <strong>Atanmış sefer yok.</strong>
          <span>Operasyon ekibinin sefer ataması burada görünecek.</span>
        </section>
      </main>
    );
  }

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
          >
            Yolcu alımı
          </button>
          <button
            onClick={() => setTripStatus('in_transit')}
            className={trip.status === 'in_transit' ? 'active' : ''}
          >
            Yola çık
          </button>
          <button
            onClick={() => setTripStatus('completed')}
            className={trip.status === 'completed' ? 'active' : ''}
          >
            Tamamla
          </button>
        </div>
      </section>

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
        >
          {sharing ? 'Durdur' : 'Konumu başlat'}
        </button>
      </section>

      {message ? <div className="error-box">{message}</div> : null}

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
          {trip.manifest.map((passenger) => (
            <PassengerRow
              passenger={passenger}
              key={passenger.ticketId}
              onStatus={setPassengerStatus}
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
              <button className="trip-switcher" key={item.id} onClick={() => loadTrip(item.id)}>
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
}: {
  passenger: Passenger;
  onStatus: (ticketId: string, status: Passenger['boardingStatus']) => Promise<void>;
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
        aria-label="Yolcu durumu"
      >
        <option value="pending">Bekliyor</option>
        <option value="boarded">Bindi</option>
        <option value="no_show">Gelmedi</option>
      </select>
    </div>
  );
}
