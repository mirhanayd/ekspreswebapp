'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LogIn, Search, Ticket } from 'lucide-react';
import { BrandLink } from './BrandLogo';
import { LogoutButton } from './LogoutButton';

const links = [
  { href: '/#sefer-ara', label: 'Sefer Ara', match: '/', icon: Search },
  { href: '/tickets', label: 'Biletlerim', match: '/tickets', icon: Ticket },
];

export function SiteHeader({ authenticated }: { authenticated: boolean }) {
  const pathname = usePathname();
  return (
    <header className="sticky top-0 z-50 h-[var(--app-header-h)] border-b border-white/10 bg-ink-950/95 text-white backdrop-blur">
      <div className="shell-wide flex h-full items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <BrandLink size="sm" />
          <span className="hidden min-w-0 border-l border-white/15 pl-3 text-2xs font-semibold uppercase tracking-[0.16em] text-ink-300 lg:block">
            Şehirlerarası yolcu taşımacılığı
          </span>
        </div>

        <nav className="flex items-center gap-1" aria-label="Ana menü">
          {links.map(({ href, label, match, icon: Icon }) => {
            const active = match === '/' ? pathname === '/' : pathname.startsWith(match);
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? 'page' : undefined}
                className={`hidden min-h-10 items-center gap-2 rounded-lg px-3 text-sm font-semibold transition md:inline-flex ${
                  active ? 'bg-white/10 text-white' : 'text-ink-200 hover:bg-white/5 hover:text-white'
                }`}
              >
                <Icon className="h-4 w-4 text-brand-300" aria-hidden />
                {label}
              </Link>
            );
          })}
          {authenticated ? (
            <LogoutButton />
          ) : (
            <Link
              href="/login"
              className="btn btn-sm btn-primary sm:min-h-11 sm:px-4 sm:text-sm"
            >
              <LogIn className="h-4 w-4" aria-hidden />
              Giriş
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
