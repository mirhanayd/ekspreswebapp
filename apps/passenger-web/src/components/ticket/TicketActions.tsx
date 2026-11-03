'use client';

import Link from 'next/link';
import { Bell, ChevronRight, Clock3, Share2 } from 'lucide-react';
import { useNotifications } from '@/components/notifications/NotificationProvider';

export function ShareTicketButton({ title, text }: { title: string; text: string }) {
  async function share() {
    try {
      if (navigator.share) await navigator.share({ title, text });
      else await navigator.clipboard.writeText(text);
    } catch {
      // Dismissing the share sheet is not an error.
    }
  }
  return (
    <button
      type="button"
      aria-label="Bileti paylaş"
      onClick={() => void share()}
      className="round-btn"
    >
      <Share2 size={19} strokeWidth={2.2} aria-hidden />
    </button>
  );
}

/** The ticket's "İniş bildirimleri" row, the live-tracking button and the not-yet-live note. */
export function TicketActions({
  stopName,
  seatNo,
  live,
  trackHref,
}: {
  stopName: string;
  seatNo: string;
  live: boolean;
  trackHref: string;
}) {
  const { prefs, notifyAny, openSettings } = useNotifications();
  const distances =
    prefs.km5 && prefs.km1 ? '5 km ve 1 km' : prefs.km5 ? '5 km' : prefs.km1 ? '1 km' : '—';

  return (
    <>
      <button
        type="button"
        onClick={() => openSettings(`${stopName} · Koltuk ${seatNo}`)}
        className="flex min-h-[66px] flex-none items-center gap-3 rounded-[22px] border border-sk-line bg-white px-3.5 py-3 text-left"
      >
        <span className="grid h-[42px] w-[42px] flex-none place-items-center rounded-[13px] bg-sk-tint text-sk-brand">
          <Bell size={20} strokeWidth={2} aria-hidden />
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="text-[15px] font-extrabold">
            {notifyAny ? 'İniş bildirimleri açık' : 'İniş bildirimleri kapalı'}
          </span>
          <span className="text-[13px] text-sk-ink2">
            {stopName} durağına {distances} kala
          </span>
        </span>
        <ChevronRight size={16} strokeWidth={2.4} aria-hidden className="text-[#9A9EA5]" />
      </button>

      {live ? (
        <Link href={trackHref} className="btn btn-brand h-[58px] flex-none no-underline">
          <span aria-hidden className="live-dot h-2 w-2 text-white" />
          Canlı izle
        </Link>
      ) : (
        <div className="flex flex-none items-center gap-3 rounded-[20px] bg-[#E9E9E5] px-4 py-3.5 text-sm leading-snug text-[#3F434B]">
          <Clock3 size={18} aria-hidden className="flex-none" />
          Canlı takip, otobüs yola çıktığında bu ekranda açılır.
        </div>
      )}
    </>
  );
}
