'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ChevronLeft, Download, LogOut } from 'lucide-react';
import { useDriver } from '@/components/DriverProvider';
import { isStandalone, useInstallPrompt } from '@/components/PwaRegister';

export default function DriverProfilePage() {
  const { driver, sharing, stopLocationSharing, logout } = useDriver();
  const { available, install } = useInstallPrompt();
  const [standalone, setStandalone] = useState(false);
  useEffect(() => setStandalone(isStandalone()), []);

  const initials = driver
    ? `${driver.firstName.charAt(0)}${driver.lastName.charAt(0)}`.toLocaleUpperCase('tr-TR')
    : 'Ş';

  return (
    <main className="page">
      <header className="page-head">
        <Link href="/" className="round" aria-label="Ana ekrana dön">
          <ChevronLeft size={20} strokeWidth={2.4} aria-hidden />
        </Link>
        <h1>Profil</h1>
      </header>

      <section className="panel profile-card">
        <span className="avatar" aria-hidden>
          {initials}
        </span>
        <div>
          <strong>{driver ? `${driver.firstName} ${driver.lastName}` : 'Şoför'}</strong>
          <p className="muted" style={{ overflowWrap: 'anywhere' }}>
            {driver?.email ?? 'Şoför hesabı'}
          </p>
        </div>
      </section>

      <section className="panel">
        <div>
          <h2 className="eyebrow">Konum paylaşımı</h2>
          <p className="muted" style={{ marginTop: 6 }}>
            {sharing
              ? 'Açık. Yolcular otobüsü canlı izliyor.'
              : 'Kapalı. Sefer başladığında otomatik açılır.'}
          </p>
        </div>
        {sharing ? (
          <button type="button" className="btn-quiet" onClick={stopLocationSharing}>
            Paylaşımı durdur
          </button>
        ) : null}
      </section>

      {!standalone ? (
        <section className="panel">
          <div>
            <h2 className="eyebrow">Uygulamayı yükle</h2>
            <p className="muted" style={{ marginTop: 6 }}>
              {available
                ? 'Ana ekrana ekle; tam ekran ve hızlı açılır.'
                : 'Tarayıcı menüsünden “Ana ekrana ekle” seçeneğini kullan.'}
            </p>
          </div>
          {available ? (
            <button type="button" className="btn-main" onClick={() => void install()}>
              <Download size={18} aria-hidden />
              Yükle
            </button>
          ) : null}
        </section>
      ) : null}

      <button type="button" className="btn-quiet" onClick={() => void logout()}>
        <LogOut size={18} aria-hidden />
        Çıkış yap
      </button>
    </main>
  );
}
