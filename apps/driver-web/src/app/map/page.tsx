'use client';

import { DriverMap } from '@/components/DriverMap';
import { useDriver } from '@/components/DriverProvider';
import { DriverPageShell, formatTime } from '@/components/DriverUI';

export default function DriverMapPage() {
  return <DriverPageShell><DriverMapContent /></DriverPageShell>;
}

function DriverMapContent() {
  const { trip, latestPosition, sharing, nextStop, startLocationSharing, stopLocationSharing, lastLocationAt } = useDriver();
  if (!trip) return null;

  return (
    <section className="page-section map-page">
      <div className="page-heading"><div><p className="eyebrow">CANLI OPERASYON</p><h1>Harita</h1><p>Rotanı, duraklarını ve otobüs konumunu takip et.</p></div><span className={`page-status ${sharing ? 'live' : ''}`}><i />{sharing ? 'GPS açık' : 'GPS kapalı'}</span></div>
      <DriverMap geometry={trip.route.geometry} stops={trip.route.stops} position={latestPosition} sharing={sharing} originName={trip.route.origin.name} destinationName={trip.route.destination.name} nextStopName={nextStop?.location.name || trip.route.destination.name} />
      <section className={`location-card map-location-card ${sharing ? 'sharing' : ''}`}><div className="location-copy"><span className="live-symbol"><i /></span><div><p className="eyebrow">KONUM PAYLAŞIMI</p><h3>{sharing ? 'Yolcular seni canlı görüyor' : 'Konum paylaşımı kapalı'}</h3><p className="muted">{sharing && lastLocationAt ? `Son gönderim ${formatTime(lastLocationAt)}` : 'Konum yalnızca atanmış seferin yolcularıyla paylaşılır.'}</p></div></div><button className={sharing ? 'danger-button' : 'primary-button compact'} onClick={sharing ? stopLocationSharing : startLocationSharing}>{sharing ? 'Durdur' : 'Konumu aç'}</button></section>
    </section>
  );
}
