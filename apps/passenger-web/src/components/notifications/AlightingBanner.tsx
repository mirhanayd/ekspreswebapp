'use client';

import { useNav } from '@/components/nav/NavProvider';
import { useNotifications } from './NotificationProvider';

/** Drops in from the top with a spring when an alighting alert arrives while the app is open. */
export function AlightingBanner() {
  const { banner, bannerVisible, dismissBanner } = useNotifications();
  const nav = useNav();
  const one = banner?.threshold === 1;

  function open() {
    dismissBanner();
    if (banner?.url && !window.location.href.includes(banner.url.split('?')[0])) {
      nav.push(banner.url);
    }
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed-col z-[70] px-[10px]"
      style={{
        top: 'calc(10px + var(--safe-top))',
        transform: bannerVisible ? 'translateY(0) scale(1)' : 'translateY(-150px) scale(.94)',
        opacity: bannerVisible ? 1 : 0,
        visibility: bannerVisible ? 'visible' : 'hidden',
        transition: `transform 700ms cubic-bezier(.34,1.45,.64,1), opacity 260ms ease, visibility 0s linear ${
          bannerVisible ? 0 : 700
        }ms`,
        pointerEvents: bannerVisible ? 'auto' : 'none',
      }}
    >
      {banner ? (
        <button
          type="button"
          onClick={open}
          aria-label={`${banner.title}. Açmak için dokun`}
          className="flex w-full items-start gap-3 rounded-[24px] border-0 bg-white/[0.97] py-[14px] pl-3 pr-[14px] text-left text-sk-ink"
          style={{
            boxShadow: '0 22px 44px -14px rgba(22,23,27,.45), 0 0 0 1px rgba(22,23,27,.06)',
          }}
        >
          <span
            className={`flex h-[46px] w-[46px] flex-none flex-col items-center justify-center rounded-[14px] text-white ${
              one ? 'bg-sk-brand' : 'bg-sk-dark'
            }`}
          >
            <span className="num-md text-[19px] leading-none">{banner.threshold}</span>
            <span className="text-[9px] font-extrabold tracking-[0.06em]">KM</span>
          </span>
          <span className="flex min-w-0 flex-1 flex-col gap-[3px]">
            <span className="flex justify-between gap-2 text-xs text-sk-ink2">
              <span className="font-extrabold tracking-[0.06em]">KURTALAN EKSPRES</span>
              <span>şimdi</span>
            </span>
            <span className="text-[15px] font-extrabold leading-tight">{banner.title}</span>
            <span className="text-sm leading-snug text-[#3F434B]">{banner.body}</span>
          </span>
        </button>
      ) : null}
    </div>
  );
}
