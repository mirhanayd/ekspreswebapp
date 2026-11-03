'use client';

import { Bell } from 'lucide-react';
import { useNotifications } from './NotificationProvider';

/** Round bell that opens the alighting-notification settings. */
export function NotificationBell({
  subtitle,
  tone = 'dark',
}: {
  subtitle?: string;
  tone?: 'dark' | 'light';
}) {
  const { openSettings, notifyAny } = useNotifications();
  return (
    <button
      type="button"
      aria-label="İniş bildirimleri"
      onClick={() => openSettings(subtitle)}
      className={`relative grid h-11 w-11 place-items-center rounded-full border-0 ${
        tone === 'dark' ? 'bg-white/[0.08] text-white' : 'bg-white text-sk-ink'
      }`}
      style={tone === 'light' ? { boxShadow: '0 6px 16px rgba(22,23,27,.14)' } : undefined}
    >
      <Bell size={20} strokeWidth={2} aria-hidden />
      {notifyAny ? (
        <span
          aria-hidden
          className={`absolute right-[11px] top-2.5 h-2 w-2 rounded-full border-2 bg-[#E3392E] ${
            tone === 'dark' ? 'border-sk-dark' : 'border-white'
          }`}
        />
      ) : null}
    </button>
  );
}
