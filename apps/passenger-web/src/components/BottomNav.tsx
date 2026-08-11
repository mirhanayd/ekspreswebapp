'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { House, LogIn, Search, Ticket, UserRound } from 'lucide-react';

/**
 * Floating tab pill, mirroring the reference mobile shells: dark rounded bar
 * lifted off the bottom edge with a filled highlight on the active tab.
 * Hidden from `md` up, where the header navigation takes over.
 */
export function BottomNav({ authenticated }: { authenticated: boolean }) {
  const pathname = usePathname();
  const items = [
    { href: '/', label: 'Ana sayfa', icon: House, active: pathname === '/' },
    {
      href: '/#sefer-ara',
      label: 'Sefer ara',
      icon: Search,
      active: pathname.startsWith('/search') || pathname.startsWith('/trips'),
    },
    {
      href: '/tickets',
      label: 'Biletlerim',
      icon: Ticket,
      active: pathname.startsWith('/tickets'),
    },
    authenticated
      ? { href: '/tickets', label: 'Hesabım', icon: UserRound, active: false }
      : { href: '/login', label: 'Giriş yap', icon: LogIn, active: pathname.startsWith('/login') },
  ];

  return (
    <nav aria-label="Alt menü" className="floating-nav">
      <ul className="grid h-full grid-cols-4 items-center px-2">
        {items.map(({ href, label, icon: Icon, active }) => (
          <li key={label} className="grid place-items-center">
            <Link
              href={href}
              aria-label={label}
              aria-current={active ? 'page' : undefined}
              className={`grid h-12 w-12 place-items-center rounded-full transition ${
                active ? 'bg-brand-700 text-white shadow-brand' : 'text-ink-300 hover:text-white'
              }`}
            >
              <Icon className="h-[1.375rem] w-[1.375rem]" aria-hidden />
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
