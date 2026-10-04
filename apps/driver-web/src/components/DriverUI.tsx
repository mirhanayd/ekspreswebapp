'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useDriver, type Passenger } from './DriverProvider';

export const statusText: Record<string, string> = {
  scheduled: 'Planlandı',
  boarding: 'Yolcu alımı',
  in_transit: 'Yoldasın',
  completed: 'Tamamlandı',
};

export function formatTime(value: string) {
  return new Intl.DateTimeFormat('tr-TR', { hour: '2-digit', minute: '2-digit' }).format(new Date(value));
}

export function formatDate(value: string) {
  return new Intl.DateTimeFormat('tr-TR', { weekday: 'short', day: '2-digit', month: 'short' }).format(new Date(value));
}

export function Icon({ name }: { name: 'route' | 'users' | 'pin' | 'menu' | 'logout' | 'phone' | 'clock' | 'chevron' }) {
  const paths = {
    route: <><path d="M5 5h.01M19 19h.01" /><path d="M5 5c8 0 6 14 14 14" /><path d="M12 8v.01M12 16v.01" /></>,
    users: <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></>,
    pin: <><path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z" /><circle cx="12" cy="10" r="2.5" /></>,
    menu: <><path d="M4 6h16M4 12h16M4 18h16" /></>,
    logout: <><path d="M10 17l5-5-5-5" /><path d="M15 12H3" /><path d="M21 19V5a2 2 0 0 0-2-2h-6" /></>,
    phone: <><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.8 19.8 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 .12 4.18 2 2 0 0 1 2.11 2h3a2 2 0 0 1 2 1.72c.12.9.33 1.78.62 2.63a2 2 0 0 1-.45 2.11L6 9.73a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.85.29 1.73.5 2.63.62A2 2 0 0 1 19.72 17Z" /></>,
    clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
    chevron: <path d="m9 18 6-6-6-6" />,
  };
  return <svg aria-hidden="true" className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>;
}

export function DriverPageShell({ children }: Readonly<{ children: React.ReactNode }>) {
  const pathname = usePathname();
  const { loading, trip, message, logout } = useDriver();

  if (loading) return <main className="app-shell"><div className="loading-card">Sürücü paneli hazırlanıyor…</div></main>;
  if (!trip) return <main className="app-shell"><section className="empty-card"><span className="empty-mark"><Icon name="route" /></span><strong>Atanmış sefer yok.</strong><span>Operasyon ekibinin sefer ataması burada görünecek.</span></section></main>;

  return (
    <main className="app-shell" id="top">
      <header className="driver-header">
        <Link className="brand-line" href="/" aria-label="Sürücü ana ekranı"><span className="brand-mark">SKE</span><span>Siirt Kurtalan Ekspres</span></Link>
        <div className="driver-header-actions"><span className="connection-state"><i /> Operasyon paneli</span><button className="icon-button" onClick={() => void logout()} aria-label="Çıkış yap"><Icon name="logout" /></button></div>
      </header>
      {message ? <div className="error-box" role="alert">{message}</div> : null}
      {children}
      <nav className="bottom-nav" aria-label="Sürücü menüsü">
        <Link className={pathname === '/' ? 'active' : ''} href="/"><Icon name="route" /><span>Sefer</span></Link>
        <Link className={pathname === '/map' ? 'active' : ''} href="/map"><Icon name="pin" /><span>Harita</span></Link>
        <Link className={pathname === '/passengers' ? 'active' : ''} href="/passengers"><Icon name="users" /><span>Yolcular</span></Link>
        <Link className={pathname === '/trips' ? 'active' : ''} href="/trips"><Icon name="menu" /><span>Menü</span></Link>
      </nav>
    </main>
  );
}

export function PassengerRow({ passenger }: { passenger: Passenger }) {
  const { setPassengerStatus } = useDriver();
  return (
    <div className="passenger-row">
      <div className="seat-box">{passenger.seatNo}</div>
      <div className="passenger-main"><strong>{passenger.firstName} {passenger.lastName}</strong><span>{passenger.phone || passenger.email || passenger.ticketNo}</span></div>
      {passenger.phone ? <a className="phone-button" href={`tel:${passenger.phone.replace(/\s/g, '')}`} aria-label={`${passenger.firstName} adlı yolcuyu ara`}><Icon name="phone" /><span>Ara</span></a> : null}
      <select value={passenger.boardingStatus} onChange={(event) => void setPassengerStatus(passenger.ticketId, event.target.value as Passenger['boardingStatus'])} aria-label="Yolcu durumu">
        <option value="pending">Bekliyor</option><option value="boarded">Bindi</option><option value="no_show">Gelmedi</option>
      </select>
    </div>
  );
}
