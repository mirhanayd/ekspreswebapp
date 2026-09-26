'use client';

import Image from 'next/image';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

type BoardingStatus = 'pending' | 'boarded' | 'no_show';
type DriverTab = 'today' | 'route' | 'passengers' | 'location' | 'profile';
type PassengerFilter = BoardingStatus | 'all';

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
  boardingStatus: BoardingStatus;
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

const statusLabels: Record<string, string> = {
  scheduled: 'Planlandı',
  boarding: 'Yolcu alımı',
  in_transit: 'Yolda',
  completed: 'Tamamlandı',
};

const boardingLabels: Record<BoardingStatus, string> = {
  pending: 'Bekliyor',
  boarded: 'Bindi',
  no_show: 'Gelmedi',
};

const nextStatuses: Record<string, { value: string; label: string } | undefined> = {
  scheduled: { value: 'boarding', label: 'Yolcu alımını başlat' },
  boarding: { value: 'in_transit', label: 'Yola çık' },
  in_transit: { value: 'completed', label: 'Seferi tamamla' },
};

const tabs: Array<{ id: DriverTab; label: string }> = [
  { id: 'today', label: 'Bugün' },
  { id: 'route', label: 'Güzergâh' },
  { id: 'passengers', label: 'Yolcular' },
  { id: 'location', label: 'Konum' },
  { id: 'profile', label: 'Profil' },
];

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch('/api/driver/' + path, {
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
    weekday: 'long',
    day: '2-digit',
    month: 'long',
  }).format(new Date(value));
}

function AppIcon({ kind }: { kind: DriverTab }) {
  const common = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  if (kind === 'today') return <svg viewBox="0 0 24 24" aria-hidden="true" {...common}><path d="m3 10 9-7 9 7v10H3z"/><path d="M9 20v-7h6v7"/></svg>;
  if (kind === 'route') return <svg viewBox="0 0 24 24" aria-hidden="true" {...common}><circle cx="6" cy="5" r="2"/><circle cx="18" cy="19" r="2"/><path d="M6 7v5a5 5 0 0 0 5 5h7"/><path d="m14 13 4 4-4 4"/></svg>;
  if (kind === 'passengers') return <svg viewBox="0 0 24 24" aria-hidden="true" {...common}><circle cx="9" cy="8" r="3"/><path d="M3 20v-2a6 6 0 0 1 12 0v2z"/><path d="M16 5a3 3 0 0 1 0 6M17 15a5 5 0 0 1 4 5"/></svg>;
  if (kind === 'location') return <svg viewBox="0 0 24 24" aria-hidden="true" {...common}><path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0z"/><circle cx="12" cy="10" r="2.5"/></svg>;
  return <svg viewBox="0 0 24 24" aria-hidden="true" {...common}><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg>;
}

function SeatPassenger({
  passenger,
  trip,
  busy,
  onStatus,
}: {
  passenger: Passenger;
  trip: Trip;
  busy: boolean;
  onStatus: (ticketId: string, status: BoardingStatus) => Promise<void>;
}) {
  const boardAt =
    trip.route.stops.find((stop) => stop.locationId === passenger.boardingLocationId)?.location
      .name || trip.route.origin.name;
  const leaveAt =
    trip.route.stops.find((stop) => stop.locationId === passenger.alightingLocationId)?.location
      .name || trip.route.destination.name;
  return (
    <article className="v2-passenger" aria-label={passenger.firstName + ' ' + passenger.lastName}>
      <div className="v2-passenger-top">
        <span className="v2-seat" aria-label={'Koltuk ' + passenger.seatNo}>
          {passenger.seatNo}
        </span>
        <div className="v2-passenger-name">
          <strong>{passenger.firstName} {passenger.lastName}</strong>
          <span>Koltuk {passenger.seatNo} · {passenger.phone || 'Telefon belirtilmedi'}</span>
        </div>
        <span className={'v2-state v2-state-' + passenger.boardingStatus}>
          {boardingLabels[passenger.boardingStatus]}
        </span>
      </div>
      <dl className="v2-passenger-facts">
        <div><dt>Biniş</dt><dd>{boardAt}</dd></div>
        <div><dt>İniş</dt><dd>{leaveAt}</dd></div>
      </dl>
      <div className="v2-passenger-actions">
        {passenger.phone ? (
          <a className="v2-action v2-call" href={'tel:' + passenger.phone.replace(/\s/g, '')} aria-label={passenger.firstName + ' adlı yolcuyu ara'}>
            Ara
          </a>
        ) : null}
        <button
          className={'v2-action ' + (passenger.boardingStatus === 'boarded' ? 'v2-action-active' : '')}
          type="button"
          disabled={busy}
          aria-pressed={passenger.boardingStatus === 'boarded'}
          onClick={() => void onStatus(passenger.ticketId, 'boarded')}
        >Bindi</button>
        <button
          className={'v2-action ' + (passenger.boardingStatus === 'no_show' ? 'v2-action-missed' : '')}
          type="button"
          disabled={busy}
          aria-pressed={passenger.boardingStatus === 'no_show'}
          onClick={() => void onStatus(passenger.ticketId, 'no_show')}
        >Gelmedi</button>
        {passenger.boardingStatus !== 'pending' ? (
          <button className="v2-reset" type="button" disabled={busy} onClick={() => void onStatus(passenger.ticketId, 'pending')}>
            Bekliyor olarak işaretle
          </button>
        ) : null}
      </div>
    </article>
  );
}

export function DriverDashboard() {
  const router = useRouter();
  const [trips, setTrips] = useState<TripSummary[]>([]);
  const [trip, setTrip] = useState<Trip | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [tab, setTab] = useState<DriverTab>('today');
  const [filter, setFilter] = useState<PassengerFilter>('all');
  const [search, setSearch] = useState('');
  const [selectedStop, setSelectedStop] = useState<string | null>(null);
  const [busyTicketId, setBusyTicketId] = useState<string | null>(null);
  const [updatingTrip, setUpdatingTrip] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [gpsState, setGpsState] = useState<'off' | 'waiting' | 'online' | 'error'>('off');
  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null);
  const [lastLocationAt, setLastLocationAt] = useState<string | null>(null);
  const [lastPosition, setLastPosition] = useState<{ latitude: number; longitude: number } | null>(null);
  const [background, setBackground] = useState(false);
  const watchId = useRef<number | null>(null);
  const lastSentAt = useRef(0);
  const activeGpsTripId = useRef<string | null>(null);

  const stopLocationSharing = useCallback(() => {
    if (watchId.current !== null && typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchId.current);
    }
    watchId.current = null;
    activeGpsTripId.current = null;
    setSharing(false);
    setGpsState('off');
  }, []);

  const loadTrip = useCallback(async (tripId: string) => {
    const detail = await api<Trip>('trips/' + tripId);
    setTrip(detail);
    setTrips((previous) => previous.map((item) => item.id === tripId
      ? { ...item, status: detail.status, passengerSummary: {
          total: detail.manifest.length,
          boarded: detail.manifest.filter((item) => item.boardingStatus === 'boarded').length,
          noShow: detail.manifest.filter((item) => item.boardingStatus === 'no_show').length,
        } }
      : item));
  }, []);

  const load = useCallback(async () => {
    try {
      const assigned = await api<TripSummary[]>('trips');
      setTrips(assigned);
      const preferred = assigned.find((item) => item.status === 'in_transit' || item.status === 'boarding')
        || assigned.find((item) => item.status === 'scheduled') || assigned[0];
      if (preferred) await loadTrip(preferred.id);
    } catch (error) {
      if ([401, 403].includes((error as { status?: number }).status || 0)) {
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
    return () => stopLocationSharing();
  }, [load, stopLocationSharing]);

  useEffect(() => {
    const onVisibility = () => setBackground(document.visibilityState === 'hidden');
    onVisibility();
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
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

  const nextStop = useMemo(
    () => trip?.route.stops.find((stop) => stop.passengers.some((person) => person.boardingStatus === 'pending'))
      || trip?.route.stops[0],
    [trip],
  );

  const visiblePassengers = useMemo(() => {
    if (!trip) return [];
    const query = search.trim().toLocaleLowerCase('tr-TR');
    return trip.manifest.filter((person) => (filter === 'all' || person.boardingStatus === filter)
      && (!query || [person.firstName, person.lastName, person.seatNo, person.ticketNo].join(' ').toLocaleLowerCase('tr-TR').includes(query)))
      .sort((a, b) => a.seatNo.localeCompare(b.seatNo, 'tr', { numeric: true }));
  }, [trip, filter, search]);

  async function setTripStatus(status: string) {
    if (!trip || updatingTrip) return;
    if (status === 'completed' && !window.confirm('Seferi tamamlamak istediğinize emin misiniz?')) return;
    setMessage('');
    setUpdatingTrip(true);
    try {
      await api('trips/' + trip.id + '/status', { method: 'PATCH', body: JSON.stringify({ status }) });
      if (status === 'completed') stopLocationSharing();
      await loadTrip(trip.id);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Sefer durumu güncellenemedi.');
    } finally {
      setUpdatingTrip(false);
    }
  }

  async function setPassengerStatus(ticketId: string, status: BoardingStatus) {
    if (!trip || busyTicketId) return;
    setMessage('');
    setBusyTicketId(ticketId);
    try {
      await api('trips/' + trip.id + '/passengers/' + ticketId, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      await loadTrip(trip.id);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Yolcu durumu güncellenemedi.');
    } finally {
      setBusyTicketId(null);
    }
  }

  function startLocationSharing() {
    if (!trip || sharing) return;
    if (trip.status === 'completed') {
      setMessage('Tamamlanan seferde konum paylaşımı başlatılamaz.');
      return;
    }
    if (!navigator.geolocation) {
      setMessage('Bu cihaz konum paylaşımını desteklemiyor.');
      return;
    }
    setMessage('');
    setGpsState('waiting');
    const tripId = trip.id;
    activeGpsTripId.current = tripId;
    lastSentAt.current = 0;
    watchId.current = navigator.geolocation.watchPosition((position) => {
      if (activeGpsTripId.current !== tripId) return;
      setGpsAccuracy(position.coords.accuracy);
      const now = Date.now();
      if (now - lastSentAt.current < 5000) return;
      lastSentAt.current = now;
      void api('trips/' + tripId + '/location', {
        method: 'POST',
        body: JSON.stringify({
          longitude: position.coords.longitude,
          latitude: position.coords.latitude,
          speedKph: Math.max(0, (position.coords.speed || 0) * 3.6),
          headingDeg: position.coords.heading || 0,
          recordedAt: new Date(position.timestamp).toISOString(),
        }),
      }).then(() => {
        if (activeGpsTripId.current !== tripId) return;
        setGpsState('online');
        setLastPosition({ latitude: position.coords.latitude, longitude: position.coords.longitude });
        setLastLocationAt(new Date().toISOString());
      }).catch((error: unknown) => {
        if (activeGpsTripId.current !== tripId) return;
        setGpsState('error');
        setMessage(error instanceof Error ? error.message : 'Konum sunucuya gönderilemedi.');
      });
    }, (error) => {
      setMessage(error.code === error.PERMISSION_DENIED
        ? 'Konum izni verilmedi. Cihaz ayarlarından tarayıcıya izin verin.'
        : 'Cihaz konumu alınamadı. Sinyali kontrol edip tekrar deneyin.');
      stopLocationSharing();
    }, { enableHighAccuracy: true, maximumAge: 3000, timeout: 12000 });
    setSharing(true);
  }

  async function switchTrip(tripId: string) {
    stopLocationSharing();
    setSelectedStop(null);
    setTab('today');
    setMessage('');
    try {
      await loadTrip(tripId);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Sefer değiştirilemedi.');
    }
  }

  async function logout() {
    stopLocationSharing();
    await fetch('/api/auth/logout', { method: 'POST' });
    router.replace('/login');
    router.refresh();
  }

  if (loading) return <main className="v2-shell"><div className="v2-status-screen" role="status">Sefer bilgileri yükleniyor…</div></main>;

  if (!trip) return (
    <main className="v2-shell">
      <div className="v2-status-screen">
        <Image src="/brand/logo.png" alt="Siirt Kurtalan Ekspres" width={164} height={67} className="v2-logo" />
        <h1>{message ? 'Seferler yüklenemedi' : 'Henüz atanmış seferiniz yok'}</h1>
        <p>{message || 'Operasyon ekibiniz sefer atadığında burada görüntülenecektir.'}</p>
        <button className="v2-primary" onClick={() => { setLoading(true); setMessage(''); void load(); }}>Tekrar kontrol et</button>
        <button className="v2-link" onClick={() => void logout()}>Çıkış yap</button>
      </div>
    </main>
  );

  const nextAction = nextStatuses[trip.status];
  const activeStop = trip.route.stops.find((stop) => stop.id === selectedStop) || nextStop;
  const tripLabel = trip.route.origin.name + ' → ' + trip.route.destination.name;

  return (
    <div className="v2-shell">
      <div className="v2-page">
        <header className="v2-topbar">
          <Image src="/brand/logo.png" alt="Siirt Kurtalan Ekspres" width={148} height={61} className="v2-logo" priority />
          <div className="v2-topbar-right">
            <span className={'v2-header-dot' + (sharing && gpsState === 'online' ? ' v2-dot-on' : '')} aria-hidden="true" />
            <span className="v2-topbar-status">{sharing && gpsState === 'online' ? 'GPS gönderiliyor' : 'Şoför paneli'}</span>
            <button type="button" className="v2-avatar" aria-label="Profil ekranını aç" onClick={() => setTab('profile')}>SK</button>
          </div>
        </header>

        {message ? <div className="v2-alert" role="alert">{message}<button type="button" onClick={() => setMessage('')} aria-label="Uyarıyı kapat">×</button></div> : null}

        {tab === 'today' ? (
          <main className="v2-main" id="main">
            <p className="v2-overline">BUGÜNÜN OPERASYONU</p>
            <h1 className="v2-display">Yolun kontrolü<br /><em>sende.</em></h1>
            <div className="v2-chiprow">
              <span className="v2-chip v2-chip-dark">{statusLabels[trip.status] || trip.status}</span>
              <span className="v2-chip">{trip.bus.plateNumber}</span>
            </div>
            <section className="v2-trip-card" aria-label="Aktif sefer">
              <div className="v2-trip-head"><span>AKTİF SEFER</span><span>{date(trip.departureTime)}</span></div>
              <div className="v2-places">
                <div><small>KALKIŞ</small><strong>{trip.route.origin.name}</strong><b>{time(trip.departureTime)}</b></div>
                <span className="v2-route-arrow" aria-hidden="true">↗</span>
                <div><small>VARIŞ</small><strong>{trip.route.destination.name}</strong><b>{time(trip.arrivalTime)}</b></div>
              </div>
              <div className="v2-trip-footer">
                <span>{trip.bus.model || 'Otobüs'}</span>
                <button type="button" onClick={() => setTab('route')}>Sefer ayrıntıları →</button>
              </div>
            </section>
            <div className="v2-today-grid">
              <section className="v2-dark-card">
                <div className="v2-panel-head"><span>{trip.status === 'completed' ? 'SEFER TAMAMLANDI' : 'İŞLEM BEKLEYEN DURAK'}</span><span className="v2-amber-dot" /></div>
                <h2>{nextStop?.location.name || trip.route.destination.name}</h2>
                <p>{nextStop ? '+' + nextStop.estimatedMinutesFromStart + ' dk · tarifeye göre' : 'Güzergâh bilgisi bekleniyor'} · {nextStop?.passengers.filter((p) => p.boardingStatus === 'pending').length || 0} yolcu bekliyor</p>
                <button type="button" className="v2-dark-cta" onClick={() => { setSelectedStop(nextStop?.id || null); setTab('route'); }}>Durak ve yolcuları aç <span aria-hidden="true">↗</span></button>
              </section>
              <section className="v2-summary">
                <div className="v2-summary-title"><div><span className="v2-overline">YOLCU DURUMU</span><h2>{counts.boarded} <small>/ {counts.total}</small></h2></div><button type="button" onClick={() => setTab('passengers')}>Tümü →</button></div>
                <div className="v2-facts"><div><strong>{counts.boarded}</strong><span>Bindi</span></div><div><strong>{counts.pending}</strong><span>Bekliyor</span></div><div><strong>{counts.noShow}</strong><span>Gelmedi</span></div></div>
              </section>
            </div>
            <section className="v2-bottom-card">
              <div><span className="v2-overline">KONUM PAYLAŞIMI</span><h2>{gpsState === 'online' ? 'Konum sunucuya ulaşıyor' : sharing ? 'GPS sinyali bekleniyor' : 'Konum paylaşımı kapalı'}</h2><p>{lastLocationAt ? 'Son başarılı gönderim ' + time(lastLocationAt) : 'Yolcuların canlı takibi için konumu açın.'}</p></div>
              <button className="v2-primary" type="button" onClick={() => setTab('location')}>GPS paneli →</button>
            </section>
            {nextAction ? <button type="button" className="v2-trip-action" disabled={updatingTrip} onClick={() => void setTripStatus(nextAction.value)}>{updatingTrip ? 'Güncelleniyor…' : nextAction.label} <span aria-hidden="true">→</span></button> : null}
          </main>
        ) : null}

        {tab === 'route' ? (
          <main className="v2-main" id="main">
            <p className="v2-overline">SEFER OPERASYONU</p>
            <h1 className="v2-title">Yol boyunca,<br />adım adım.</h1>
            <p className="v2-subtitle">{tripLabel} · {time(trip.departureTime)}</p>
            <div className="v2-route-meta"><span>{trip.route.stops.length} durak</span><span>{counts.total} yolcu</span><span>{statusLabels[trip.status] || trip.status}</span></div>
            <ol className="v2-timeline" aria-label="Güzergâh durakları">
              {trip.route.stops.map((stop, index) => {
                const waiting = stop.passengers.filter((p) => p.boardingStatus === 'pending').length;
                const opened = activeStop?.id === stop.id;
                return <li key={stop.id} className={opened ? 'v2-stop-open' : ''}>
                  <button type="button" className="v2-stop-button" aria-expanded={opened} onClick={() => setSelectedStop(opened ? '' : stop.id)}>
                    <span className="v2-stop-number">{index + 1}</span>
                    <span className="v2-stop-info"><strong>{stop.location.name}</strong><small>+{stop.estimatedMinutesFromStart} dk · {stop.passengers.length} binecek</small></span>
                    <span className="v2-stop-count">{waiting} bekliyor</span>
                    <span aria-hidden="true">⌄</span>
                  </button>
                  {opened ? <div className="v2-stop-detail">
                    {stop.passengers.length ? stop.passengers.map((person) => <SeatPassenger key={person.ticketId} passenger={person} trip={trip} busy={busyTicketId !== null} onStatus={setPassengerStatus} />)
                      : <p className="v2-empty-inline">Bu duraktan binecek yolcu bulunmuyor.</p>}
                  </div> : null}
                </li>;
              })}
            </ol>
            {nextAction ? <button type="button" className="v2-trip-action" disabled={updatingTrip} onClick={() => void setTripStatus(nextAction.value)}>{updatingTrip ? 'Güncelleniyor…' : nextAction.label} <span aria-hidden="true">→</span></button> : null}
          </main>
        ) : null}

        {tab === 'passengers' ? (
          <main className="v2-main" id="main">
            <p className="v2-overline">SEFER MANİFESTOSU</p>
            <h1 className="v2-title">Yolcuların<br />burada.</h1>
            <label className="v2-search-label" htmlFor="v2-passenger-search">Yolcu veya koltuk ara</label>
            <input id="v2-passenger-search" className="v2-search" type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Ad soyad, koltuk veya bilet…" />
            <div className="v2-filters" role="group" aria-label="Yolcu durumu filtresi">
              {([
                ['all', 'Tümü', counts.total],
                ['pending', 'Bekliyor', counts.pending],
                ['boarded', 'Bindi', counts.boarded],
                ['no_show', 'Gelmedi', counts.noShow],
              ] as const).map(([value, label, count]) => <button type="button" key={value} className={filter === value ? 'v2-filter v2-filter-active' : 'v2-filter'} aria-pressed={filter === value} onClick={() => setFilter(value)}>{label} <span>{count}</span></button>)}
            </div>
            <p className="v2-list-count" aria-live="polite">{visiblePassengers.length} yolcu gösteriliyor</p>
            <div className="v2-manifest">{visiblePassengers.map((person) => <SeatPassenger key={person.ticketId} passenger={person} trip={trip} busy={busyTicketId !== null} onStatus={setPassengerStatus} />)}</div>
            {visiblePassengers.length === 0 ? <div className="v2-empty-inline"><p>Bu filtreyle eşleşen yolcu bulunamadı.</p><button type="button" className="v2-primary" onClick={() => { setFilter('all'); setSearch(''); }}>Filtreleri temizle</button></div> : null}
          </main>
        ) : null}

        {tab === 'location' ? (
          <main className="v2-main" id="main">
            <p className="v2-overline">CANLI KONUM</p>
            <h1 className="v2-title">Yolcuların<br />gözü yolda.</h1>
            <section className="v2-gps-card">
              <div className="v2-gps-heading"><span className={'v2-gps-pulse ' + (gpsState === 'online' ? 'v2-pulse-on' : '')} /><span>{gpsState === 'online' ? 'Sunucuya aktarılıyor' : sharing ? 'GPS sinyali bekleniyor' : 'Konum kapalı'}</span></div>
              <p>Son başarılı gönderim: <strong>{lastLocationAt ? time(lastLocationAt) : 'Henüz yok'}</strong></p>
              <p>GPS doğruluğu: <strong>{gpsAccuracy !== null ? '±' + Math.round(gpsAccuracy) + ' m' : 'Ölçülmedi'}</strong></p>
              <p className="v2-gps-disclaimer">Sunucuya aktarım, Ably üzerinden yolcuya ulaştığına dair kesin onay değildir. Tarayıcı arka planda veya telefon kilitliyken paylaşımı durdurabilir.</p>
              {background && sharing ? <p className="v2-inline-warning">Uygulama arka planda. Konum güncellemesi kesintiye uğrayabilir.</p> : null}
              {gpsState === 'error' ? <p className="v2-inline-warning">Son konum gönderimi başarısız. İnternet bağlantınızı kontrol edin.</p> : null}
              <button className={sharing ? 'v2-stop-sharing' : 'v2-primary v2-start-sharing'} type="button" role="switch" aria-checked={sharing} onClick={sharing ? stopLocationSharing : startLocationSharing}>{sharing ? 'Konum paylaşımını durdur' : 'Canlı konum paylaşımını başlat'}</button>
            </section>
            <section className="v2-route-schematic" aria-label="Güzergâh şeması">
              <div className="v2-schematic-head"><strong>Güzergâh</strong><span>{trip.bus.plateNumber}</span></div>
              <ol>{trip.route.stops.map((stop, index) => <li key={stop.id}><span className="v2-map-point">{index + 1}</span><div><strong>{stop.location.name}</strong><small>Planlanan +{stop.estimatedMinutesFromStart} dk</small></div></li>)}</ol>
              {lastPosition ? <p className="v2-coordinate">Son gönderilen koordinat: {lastPosition.latitude.toFixed(5)}, {lastPosition.longitude.toFixed(5)}</p> : <p className="v2-coordinate">İlk GPS verisi alındığında koordinat görüntülenecek.</p>}
              <p className="v2-map-note">Durak şemasıdır; canlı GPS haritası ve rota üzerinde gerçek konum eşlemesi sonraki aşamada doğrulanacaktır.</p>
            </section>
          </main>
        ) : null}

        {tab === 'profile' ? (
          <main className="v2-main" id="main">
            <p className="v2-overline">SİİRT KURTALAN EKSPRES</p>
            <h1 className="v2-title">İyi yolculuklar,<br />kaptan.</h1>
            <section className="v2-profile-vehicle">
              <Image src="/brand/coach.jpg" alt="Siirt Kurtalan Ekspres otobüsü" fill sizes="(max-width: 768px) 100vw, 700px" className="v2-coach-photo" />
              <div className="v2-vehicle-overlay"><span>ATANMIŞ ARAÇ</span><strong>{trip.bus.plateNumber}</strong><small>{trip.bus.model || 'Otobüs'}</small></div>
            </section>
            <section className="v2-profile-panel"><span className="v2-overline">MEVCUT SEFER</span><h2>{tripLabel}</h2><p>{date(trip.departureTime)} · {time(trip.departureTime)}</p><span className="v2-chip v2-chip-dark">{statusLabels[trip.status] || trip.status}</span></section>
            {trips.length > 1 ? <section className="v2-other-trips"><h2>Diğer atamalarım</h2>{trips.filter((item) => item.id !== trip.id).map((item) => <button key={item.id} type="button" onClick={() => void switchTrip(item.id)}><strong>{item.route.origin.name} → {item.route.destination.name}</strong><span>{date(item.departureTime)} · {time(item.departureTime)} · {statusLabels[item.status] || item.status}</span><b aria-hidden="true">↗</b></button>)}</section> : null}
            <button type="button" className="v2-logout" onClick={() => void logout()}>Güvenli çıkış yap →</button>
          </main>
        ) : null}
      </div>
      <nav className="v2-bottom-nav" aria-label="Şoför ana menüsü">
        {tabs.map((item) => <button type="button" key={item.id} aria-current={tab === item.id ? 'page' : undefined} className={tab === item.id ? 'v2-nav-active' : ''} onClick={() => { setTab(item.id); window.scrollTo({ top: 0, behavior: 'smooth' }); }}><span className="v2-nav-icon"><AppIcon kind={item.id} /></span><span>{item.label}</span></button>)}
      </nav>
    </div>
  );
}
