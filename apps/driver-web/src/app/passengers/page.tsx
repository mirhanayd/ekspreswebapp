'use client';

import { useDriver } from '@/components/DriverProvider';
import { DriverPageShell, PassengerRow } from '@/components/DriverUI';

export default function DriverPassengersPage() {
  return <DriverPageShell><DriverPassengersContent /></DriverPageShell>;
}

function DriverPassengersContent() {
  const { trip, counts } = useDriver();
  if (!trip) return null;

  return (
    <section className="page-section passenger-page">
      <div className="page-heading"><div><p className="eyebrow">MANİFESTO</p><h1>Yolcular</h1><p>Biniş durumlarını durak durak güncelle.</p></div><span className="page-count">{counts.total} kişi</span></div>
      <section className="metric-grid passenger-metrics"><article><span>Toplam</span><strong>{counts.total}</strong><small>yolcu</small></article><article><span>Bindi</span><strong>{counts.boarded}</strong><small>tamam</small></article><article><span>Bekliyor</span><strong>{counts.pending}</strong><small>işlem</small></article><article><span>Gelmedi</span><strong>{counts.noShow}</strong><small>kayıt</small></article></section>
      <section className="section-block page-list-block"><div className="section-heading"><div><p className="eyebrow">TÜM KAYITLAR</p><h3>Yolcu listesi</h3></div><span>{counts.total} kayıt</span></div><div className="manifest-list passenger-page-list">{trip.manifest.map((passenger) => <PassengerRow passenger={passenger} key={passenger.ticketId} />)}</div></section>
    </section>
  );
}
