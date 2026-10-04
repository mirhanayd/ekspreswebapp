'use client';

import { useDriver } from '@/components/DriverProvider';
import { DriverPageShell, formatDate, formatTime, Icon, statusText } from '@/components/DriverUI';

export default function DriverTripsPage() {
  return <DriverPageShell><DriverTripsContent /></DriverPageShell>;
}

function DriverTripsContent() {
  const { trips, trip, loadTrip } = useDriver();
  return (
    <section className="page-section trips-page">
      <div className="page-heading"><div><p className="eyebrow">OPERASYON</p><h1>Seferler</h1><p>Sana atanmış seferler burada.</p></div><span className="page-count"><Icon name="route" /> {trips.length}</span></div>
      <div className="trip-list">
        {trips.map((item) => <button className={`trip-list-card ${item.id === trip?.id ? 'selected' : ''}`} key={item.id} onClick={() => void loadTrip(item.id)}><span className="trip-list-icon"><Icon name="route" /></span><span className="trip-list-main"><small>{formatDate(item.departureTime)} · {formatTime(item.departureTime)}</small><strong>{item.route.origin.name} <i>→</i> {item.route.destination.name}</strong><span>{item.route.name} · {item.bus.plateNumber}</span></span><span className={`trip-list-status status-${item.status}`}>{statusText[item.status] || item.status}</span><Icon name="chevron" /></button>)}
      </div>
    </section>
  );
}
