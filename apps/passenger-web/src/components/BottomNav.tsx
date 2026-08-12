'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BadgePercent, House, Route, Ticket, UserRound } from 'lucide-react';

/**
 * Floating tab pill from `ui/mobile-home-reference.png`: a near-black capsule
 * lifted off the bottom edge (inset-x 20, bottom 18, height 72) carrying five
 * icon-only tabs, the active one filled with a lime rounded tile.
 *
 * Hidden from `lg` up, where the top rail takes over.
 */
export function BottomNav({ authenticated }: { authenticated: boolean }) {
  const pathname = usePathname();

  // Live tracking is a full-screen immersive map in the reference, dismissed by
  // its own control rather than by a tab bar.
  if (pathname.includes('/live')) return null;

  const items = [
    { href: '/', label: 'Ana sayfa', icon: House, active: pathname === '/' },
    {
      href: '/search',
      label: 'Sefer ara',
      icon: Route,
      active: pathname.startsWith('/search') || pathname.startsWith('/trips'),
    },
    {
      href: '/tickets',
      label: 'Biletlerim',
      icon: Ticket,
      active: pathname.startsWith('/tickets'),
    },
    {
      href: '/kampanyalar',
      label: 'Kampanyalar',
      icon: BadgePercent,
      active: pathname.startsWith('/kampanyalar'),
    },
    authenticated
      ? { href: '/hesap', label: 'Hesabım', icon: UserRound, active: pathname.startsWith('/hesap') }
      : {
          href: '/login',
          label: 'Giriş yap',
          icon: UserRound,
          active: pathname.startsWith('/login'),
        },
  ];

  return (
    <nav aria-label="Alt menü" className="tab-bar">
      <ul className="flex h-full items-center justify-between px-3">
        {items.map(({ href, label, icon: Icon, active }) => (
          <li key={label}>
            <Link
              href={href}
              aria-label={label}
              aria-current={active ? 'page' : undefined}
              className={`tab-item ${active ? 'tab-item-active' : 'hover:text-white'}`}
            >
              <Icon className="h-[1.375rem] w-[1.375rem]" strokeWidth={2} aria-hidden />
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
