'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  BusFront,
  CircleAlert,
  CircleCheck,
  Info,
  Map as MapIcon,
  RefreshCw,
  ScanLine,
  Search,
  UserRound,
  Users,
  X,
} from 'lucide-react';
import { useDriver, type Passenger, type Trip } from './DriverProvider';

export const statusText: Record<string, string> = {
  scheduled: 'Planlandı',
  boarding: 'Yolcu alımı',
  in_transit: 'Yolda',
  completed: 'Tamamlandı',
  cancelled: 'İptal',
};

export const boardingText: Record<Passenger['boardingStatus'], string> = {
  pending: 'Bekliyor',
  boarded: 'Bindi',
  no_show: 'Gelmedi',
};

/** Optional operations-center number for the "Ara" / "Sorun bildir" actions. */
export const OPERATIONS_PHONE = process.env.NEXT_PUBLIC_OPERATIONS_PHONE?.replace(/\s/g, '') || '';

export function formatTime(value: string | Date) {
  return new Intl.DateTimeFormat('tr-TR', { hour: '2-digit', minute: '2-digit' }).format(
    new Date(value),
  );
}

export function formatDate(value: string) {
  return new Intl.DateTimeFormat('tr-TR', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
  }).format(new Date(value));
}

export function stopTime(trip: Trip, minutesFromStart: number) {
  return new Date(new Date(trip.departureTime).getTime() + minutesFromStart * 60_000);
}

export function StatusChip({ status }: { status: string }) {
  return <span className={`chip chip-${status}`}>{statusText[status] || status}</span>;
}

export function useOnline() {
  const [online, setOnline] = useState(true);
  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    update();
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    };
  }, []);
  return online;
}

export function OnlineBadge() {
  const online = useOnline();
  return (
    <span className={`online-badge ${online ? '' : 'offline'}`} role="status">
      <i aria-hidden />
      {online ? 'Çevrimiçi' : 'Çevrimdışı'}
    </span>
  );
}

/** Ticks every 30s so countdowns stay current without re-fetching. */
export function useNow(intervalMs = 30_000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), intervalMs);
    return () => window.clearInterval(timer);
  }, [intervalMs]);
  return now;
}

const tabs = [
  { href: '/', label: 'Sefer', icon: BusFront },
  { href: '/passengers', label: 'Yolcular', icon: Users },
  { href: '/map', label: 'Güzergâh', icon: MapIcon },
  { href: '/profile', label: 'Profil', icon: UserRound },
];

function TabBar() {
  const pathname = usePathname();
  return (
    <nav className="tabbar" aria-label="Sürücü menüsü">
      <ul>
        {tabs.map(({ href, label, icon: Icon }) => (
          <li key={href}>
            <Link href={href} aria-current={pathname === href ? 'page' : undefined}>
              <Icon aria-hidden />
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export function Alerts() {
  const { message, notice } = useDriver();
  return (
    <>
      {message ? (
        <div className="alert" role="alert">
          <CircleAlert size={20} aria-hidden />
          {message}
        </div>
      ) : null}
      {notice ? (
        <div className="notice" role="status">
          <Info size={20} aria-hidden />
          {notice}
        </div>
      ) : null}
    </>
  );
}

export function DriverPageShell({
  children,
  requireTrip = true,
  cta = false,
  flush = false,
}: Readonly<{ children: React.ReactNode; requireTrip?: boolean; cta?: boolean; flush?: boolean }>) {
  const { loading, trip, message, notice, reload } = useDriver();

  let content = children;
  if (loading) {
    content = (
      <div className="loading" role="status">
        <span className="spinner" aria-hidden />
        Sürücü paneli hazırlanıyor…
      </div>
    );
  } else if (requireTrip && !trip) {
    content = (
      <section className="card empty">
        <BusFront aria-hidden />
        <strong>{message ? 'Seferler yüklenemedi' : 'Atanmış sefer yok'}</strong>
        <span>
          {message ||
            notice ||
            'Operasyon ekibinin sefer ataması burada görünecek. Ekran otomatik yenilenir.'}
        </span>
        <button type="button" className="btn btn-secondary" onClick={reload}>
          <RefreshCw aria-hidden />
          Yenile
        </button>
      </section>
    );
  }

  return (
    <main className={`app-shell ${cta ? 'has-cta' : ''}`}>
      <div className="page">
        {!flush || loading || (requireTrip && !trip) ? <Alerts /> : null}
        {content}
      </div>
      <TabBar />
    </main>
  );
}

/**
 * Manual ticket check: there is no driver-side QR verification endpoint yet, so the driver
 * types the ticket or seat number and the match is marked boarded through the boarding API.
 */
export function TicketCheckSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { trip, setPassengerStatus, busyTickets } = useDriver();
  const [query, setQuery] = useState('');
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setQuery('');
    window.setTimeout(() => input.current?.focus(), 50);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open || !trip) return null;

  const needle = query.trim().toLocaleUpperCase('tr-TR');
  const match = needle
    ? trip.manifest.find(
        (passenger) =>
          passenger.ticketNo.toLocaleUpperCase('tr-TR') === needle ||
          passenger.seatNo.toLocaleUpperCase('tr-TR') === needle,
      )
    : undefined;

  return (
    <div
      className="sheet-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section className="sheet" role="dialog" aria-modal="true" aria-labelledby="ticket-check">
        <div className="sheet-head">
          <h2 id="ticket-check">Bilet kontrol</h2>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Kapat">
            <X aria-hidden />
          </button>
        </div>
        <label className="field">
          Bilet no veya koltuk no
          <input
            ref={input}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            inputMode="text"
            autoCapitalize="characters"
            autoComplete="off"
            placeholder="TKT-… / 12"
          />
        </label>
        {needle && !match ? (
          <div className="alert" role="status">
            <Search size={20} aria-hidden />
            Bu seferde eşleşen bilet yok.
          </div>
        ) : null}
        {match ? (
          <div className="pax-row">
            <span className="seat">{match.seatNo}</span>
            <div className="pax-main">
              <strong>
                {match.firstName} {match.lastName}
              </strong>
              <span className="mono">{match.ticketNo}</span>
            </div>
            <div className="pax-state">
              <span className={`chip chip-${match.boardingStatus}`}>
                {boardingText[match.boardingStatus]}
              </span>
              {match.boardingStatus !== 'boarded' ? (
                <button
                  type="button"
                  className="btn btn-ok"
                  disabled={busyTickets.has(match.ticketId)}
                  onClick={() => void setPassengerStatus(match.ticketId, 'boarded')}
                >
                  <CircleCheck aria-hidden />
                  Bindi
                </button>
              ) : null}
            </div>
          </div>
        ) : null}
        <p className="muted" style={{ fontSize: '0.875rem' }}>
          Kamera ile QR okuma, sürücü bilet doğrulama servisi eklendiğinde açılacak.
        </p>
      </section>
    </div>
  );
}

export function TicketCheckButton({
  className = 'btn btn-secondary btn-lg',
}: {
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  return (
    <>
      <button type="button" className={className} onClick={() => setOpen(true)}>
        <ScanLine aria-hidden />
        Bilet okut
      </button>
      <TicketCheckSheet open={open} onClose={close} />
    </>
  );
}
