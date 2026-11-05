'use client';

import Link from 'next/link';
import { Bell, ChevronRight, Gift, LogOut, MapPinned, Ticket } from 'lucide-react';
import { useState } from 'react';
import { useNotifications } from '@/components/notifications/NotificationProvider';

const rowClass =
  'flex min-h-[60px] w-full items-center gap-[14px] border-0 border-b border-[#F0F0ED] bg-transparent px-4 text-left text-inherit no-underline';

function Tile({ tone, children }: { tone: 'brand' | 'plain'; children: React.ReactNode }) {
  return (
    <span
      className={`grid h-9 w-9 flex-none place-items-center rounded-[11px] ${
        tone === 'brand' ? 'bg-sk-tint text-sk-brand' : 'bg-sk-bg text-sk-ink'
      }`}
    >
      {children}
    </span>
  );
}

/** Account list: notification settings open from here, the rest are plain destinations. */
export function AccountRows() {
  const { notifyAny, openSettings } = useNotifications();
  const [pending, setPending] = useState(false);

  async function logout() {
    setPending(true);
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } finally {
      // A full load, so the server-rendered shell also forgets the session.
      window.location.replace('/');
    }
  }

  return (
    <div className="flex flex-col overflow-hidden rounded-3xl border border-sk-line bg-white">
      <button type="button" onClick={() => openSettings()} className={rowClass}>
        <Tile tone="brand">
          <Bell size={18} strokeWidth={2} aria-hidden />
        </Tile>
        <span className="flex-1 text-base font-bold">İniş bildirimleri</span>
        <span className="text-sm text-sk-ink2">{notifyAny ? 'Açık' : 'Kapalı'}</span>
        <ChevronRight size={16} strokeWidth={2.4} aria-hidden className="text-[#9A9EA5]" />
      </button>
      <Link href="/tickets" className={rowClass}>
        <Tile tone="plain">
          <Ticket size={18} strokeWidth={2} aria-hidden />
        </Tile>
        <span className="flex-1 text-base font-bold">Biletlerim</span>
        <ChevronRight size={16} strokeWidth={2.4} aria-hidden className="text-[#9A9EA5]" />
      </Link>
      <Link href="/kampanyalar/arkadasini-davet-et" className={rowClass}>
        <Tile tone="plain">
          <Gift size={18} strokeWidth={2} aria-hidden />
        </Tile>
        <span className="flex-1 text-base font-bold">Arkadaşını davet et</span>
        <span className="text-sm text-sk-ink2">75 ₺</span>
        <ChevronRight size={16} strokeWidth={2.4} aria-hidden className="text-[#9A9EA5]" />
      </Link>
      <Link href="/" className={rowClass}>
        <Tile tone="plain">
          <MapPinned size={18} strokeWidth={2} aria-hidden />
        </Tile>
        <span className="flex-1 text-base font-bold">Sefer ara</span>
        <ChevronRight size={16} strokeWidth={2.4} aria-hidden className="text-[#9A9EA5]" />
      </Link>
      <button
        type="button"
        onClick={() => void logout()}
        disabled={pending}
        className={`${rowClass} border-b-0 text-[#A11C15]`}
      >
        <Tile tone="brand">
          <LogOut size={18} strokeWidth={2} aria-hidden />
        </Tile>
        <span className="flex-1 text-base font-bold">{pending ? 'Çıkılıyor…' : 'Çıkış yap'}</span>
        <ChevronRight size={16} strokeWidth={2.4} aria-hidden className="text-[#9A9EA5]" />
      </button>
    </div>
  );
}
