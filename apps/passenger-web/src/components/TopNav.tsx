'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BadgePercent, House, Route, Ticket, UserRound } from 'lucide-react';
import { BrandMark } from './BrandLogo';
import { driverNavigation, isDriverPath } from '@/features/driver/navigation';

const items = [
  { href: '/', label: 'Ana sayfa', icon: House, match: (p: string) => p === '/' },
  {
    href: '/search',
    label: 'Sefer ara',
    icon: Route,
    match: (p: string) => p.startsWith('/search') || p.startsWith('/trips'),
  },
  {
    href: '/tickets',
    label: 'Biletlerim',
    icon: Ticket,
    match: (p: string) => p.startsWith('/tickets'),
  },
  {
    href: '/kampanyalar',
    label: 'Kampanyalar',
    icon: BadgePercent,
    match: (p: string) => p.startsWith('/kampanyalar'),
  },
];

/**
 * Desktop counterpart of the floating tab pill. `/ui` only specifies phone
 * screens, so the wide layout reuses the same vocabulary — a near-black
 * capsule floating over the tinted canvas, lime marking the active tab.
 */
export function TopNav({ authenticated }: { authenticated: boolean }) {
  const pathname = usePathname();
  const driver = isDriverPath(pathname);

  // Live tracking is a full-screen immersive map with its own chrome, so the
  // rail stands down there exactly as the tab pill does.
  if (pathname.includes('/live')) return null;

  return (
    <header className="fixed inset-x-0 top-0 z-50 hidden h-[var(--app-header-h)] items-center lg:flex">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-6">
        <Link
          href={driver ? '/driver' : '/'}
          aria-label="Siirt Kurtalan Ekspres ana sayfa"
          className="inline-flex"
        >
          <BrandMark className="w-32" />
        </Link>

        <nav aria-label="Ana menü" className="rounded-full bg-ink-900 p-1.5 shadow-panel">
          <ul className="flex items-center gap-1">
            {(driver ? driverNavigation : items).map(({ href, label, icon: Icon, match }) => {
              const active = match(pathname);
              return (
                <li key={href}>
                  <Link
                    href={href}
                    aria-current={active ? 'page' : undefined}
                    className={`inline-flex min-h-11 items-center gap-2 rounded-full px-4 text-[0.8125rem] font-semibold transition ${
                      active
                        ? 'bg-lime-400 text-ink-900'
                        : 'text-sage-300 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    <Icon className="h-4 w-4" aria-hidden />
                    {label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <Link
          href={driver ? '/driver/profil' : authenticated ? '/hesap' : '/login'}
          className="icon-btn icon-btn-white icon-btn-sm"
          aria-label={driver ? 'Şoför profili' : authenticated ? 'Hesabım' : 'Giriş yap'}
        >
          <UserRound className="h-[1.125rem] w-[1.125rem]" aria-hidden />
        </Link>
      </div>
    </header>
  );
}
