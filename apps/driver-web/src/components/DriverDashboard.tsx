'use client';

import { useDriver } from './DriverProvider';
import { DriverPageShell, formatDate, formatTime, Icon, statusText } from './DriverUI';
import Link from 'next/link';

export function DriverDashboard() {
  return (
    <DriverPageShell>
      <DriverHomeContent />
    </DriverPageShell>
  );
}

function DriverHomeContent() {
  const { trip, counts, nextStop, sharing, lastLocationAt, startLocationSharing, stopLocationSharing, setTripStatus } = useDriver();
  if (!trip) return null;

  return (
    <>
      <section className="welcome-row">
        <div><p className="eyebrow">BUGÜNÜN SEFERİ</p><h1>Yola hazır mısın?</h1><p className="welcome-copy">Bugünkü operasyonunu tek bakışta yönet.</p></div>
        <span className="driver-avatar" aria-hidden="true">SK</span>
      </section>

      <section className="trip-hero home-hero">
        <div className="trip-hero-top"><span className={`status-pill status-${trip.status}`}><i /> {statusText[trip.status] || trip.status}</span><span className="plate">{trip.bus.plateNumber}</span></div>
        <p className="date-line">{formatDate(trip.departureTime)} · {formatTime(trip.departureTime)} kalkış</p>
        <div className="route-title"><span>{trip.route.origin.name}</span><span className="route-arrow">→</span><span>{trip.route.destination.name}</span></div>
        <p className="trip-subtitle">{trip.route.name} · {trip.bus.model || 'Otobüs'}</p>
        <div className="route-meta"><span><b>{formatTime(trip.departureTime)}</b><small>Kalkış</small></span><span className="route-dash" /><span><b>{formatTime(trip.arrivalTime)}</b><small>Planlanan varış</small></span></div>
        <div className="status-actions"><button onClick={() => void setTripStatus('boarding')} className={trip.status === 'boarding' ? 'active' : ''}>Yolcu alımı</button><button onClick={() => void setTripStatus('in_transit')} className={trip.status === 'in_transit' ? 'active' : ''}>Yola çık</button><button onClick={() => void setTripStatus('completed')} className={trip.status === 'completed' ? 'active' : ''}>Tamamla</button></div>
      </section>

      <section className="quick-action-grid" aria-label="Hızlı işlemler">
        <Link className="quick-action quick-action-map" href="/map"><span className="quick-action-icon"><Icon name="pin" /></span><span><small>CANLI OPERASYON</small><strong>Haritayı aç</strong></span><Icon name="chevron" /></Link>
        <Link className="quick-action" href="/passengers"><span className="quick-action-icon"><Icon name="users" /></span><span><small>MANİFESTO</small><strong>{counts.pending} yolcu bekliyor</strong></span><Icon name="chevron" /></Link>
        <Link className="quick-action" href="/trips"><span className="quick-action-icon"><Icon name="route" /></span><span><small>SONRAKİ DURAK</small><strong>{nextStop?.location.name || trip.route.destination.name}</strong></span><Icon name="chevron" /></Link>
      </section>

      <section className="home-summary-grid">
        <section className="metric-grid" aria-label="Yolcu özeti"><article><span>Toplam</span><strong>{counts.total}</strong><small>yolcu</small></article><article><span>Bindi</span><strong>{counts.boarded}</strong><small>tamam</small></article><article><span>Bekliyor</span><strong>{counts.pending}</strong><small>işlem</small></article><article><span>Gelmedi</span><strong>{counts.noShow}</strong><small>kayıt</small></article></section>
        <section className={`location-card ${sharing ? 'sharing' : ''}`}><div className="location-copy"><span className="live-symbol"><i /></span><div><p className="eyebrow">CANLI KONUM</p><h3>{sharing ? 'Konum canlı' : 'Konum paylaşımını aç'}</h3><p className="muted">{sharing ? lastLocationAt ? `Son gönderim ${formatTime(lastLocationAt)}` : 'GPS sinyali bekleniyor…' : 'Yolcuların seni görebilmesi için aç.'}</p></div></div><button className={sharing ? 'danger-button' : 'primary-button compact'} onClick={sharing ? stopLocationSharing : startLocationSharing}>{sharing ? 'Durdur' : 'Konumu aç'}</button></section>
      </section>
    </>
  );
}
