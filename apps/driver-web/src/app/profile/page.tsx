'use client';

import { useEffect, useState } from 'react';
import { Download, LogOut, Smartphone } from 'lucide-react';
import { useDriver } from '@/components/DriverProvider';
import {
  DriverPageShell,
  formatDate,
  formatTime,
  OnlineBadge,
  StatusChip,
} from '@/components/DriverUI';
import { isStandalone, useInstallPrompt } from '@/components/PwaRegister';

export default function DriverProfilePage() {
  return (
    <DriverPageShell requireTrip={false}>
      <DriverProfileContent />
    </DriverPageShell>
  );
}

function DriverProfileContent() {
  const { driver, trips, trip, sharing, switchTrip, logout } = useDriver();
  const { available, install } = useInstallPrompt();
  const [standalone, setStandalone] = useState(false);
  useEffect(() => setStandalone(isStandalone()), []);

  const initials = driver
    ? `${driver.firstName.charAt(0)}${driver.lastName.charAt(0)}`.toLocaleUpperCase('tr-TR')
    : 'S';

  return (
    <>
      <header className="page-head">
        <h1>Profil</h1>
        <OnlineBadge />
      </header>

      <section className="card profile-card">
        <span className="avatar" aria-hidden>
          {initials}
        </span>
        <div>
          <p style={{ fontSize: '1.15rem', fontWeight: 600 }}>
            {driver ? `${driver.firstName} ${driver.lastName}` : 'Sürücü'}
          </p>
          <p className="muted" style={{ overflowWrap: 'anywhere' }}>
            {driver?.email ?? 'Sürücü hesabı'}
          </p>
          <p className="muted" style={{ fontSize: '0.875rem' }}>
            Konum paylaşımı {sharing ? 'açık' : 'kapalı'}
          </p>
        </div>
      </section>

      <section className="card" aria-labelledby="trips-title">
        <h2 id="trips-title" className="eyebrow">
          Atanmış seferler
        </h2>
        {trips.length ? (
          <ul className="list">
            {trips.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  className="trip-item"
                  aria-current={item.id === trip?.id}
                  onClick={() => void switchTrip(item.id)}
                >
                  <strong>
                    {item.route.origin.name} → {item.route.destination.name}
                  </strong>
                  <StatusChip status={item.status} />
                  <small>
                    {formatDate(item.departureTime)} · {formatTime(item.departureTime)} ·{' '}
                    <span className="mono">{item.bus.plateNumber}</span>
                  </small>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted" style={{ paddingTop: 12 }}>
            Size atanmış sefer yok.
          </p>
        )}
      </section>

      {!standalone ? (
        <section className="card toggle-row">
          <Smartphone size={28} aria-hidden />
          <div>
            <h2>Uygulamayı yükle</h2>
            <p>
              {available
                ? 'Ana ekrana ekleyin; tam ekran ve hızlı açılır.'
                : 'Tarayıcı menüsünden “Ana ekrana ekle” seçeneğini kullanın.'}
            </p>
          </div>
          {available ? (
            <button type="button" className="btn btn-secondary" onClick={() => void install()}>
              <Download aria-hidden />
              Yükle
            </button>
          ) : null}
        </section>
      ) : null}

      <button type="button" className="btn btn-danger-outline btn-lg" onClick={() => void logout()}>
        <LogOut aria-hidden />
        Çıkış yap
      </button>
    </>
  );
}
