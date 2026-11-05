'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Gift, House, Ticket, UserRound } from 'lucide-react';
import { TAB_ROOTS } from './NavProvider';

const TABS = [
  { href: '/', label: 'Ana sayfa', Icon: House },
  { href: '/tickets', label: 'Biletlerim', Icon: Ticket },
  { href: '/kampanyalar', label: 'Kampanyalar', Icon: Gift },
  { href: '/hesap', label: 'Hesabım', Icon: UserRound },
] as const;

/** Bottom tabs; only the four tab roots show it, detail screens hide it. */
export function TabBar() {
  const pathname = usePathname();
  const index = TAB_ROOTS.indexOf(pathname as (typeof TAB_ROOTS)[number]);
  if (index < 0) return null;

  return (
    <nav
      aria-label="Alt menü"
      className="tabbar fixed-col bottom-0 z-20 grid grid-cols-4 border-t border-sk-line bg-white/[0.97] px-2 pt-2"
      style={{
        height: 'calc(84px + var(--safe-bottom))',
        paddingBottom: 'calc(22px + var(--safe-bottom))',
      }}
    >
      <span
        aria-hidden
        className="absolute -top-px h-[3px] w-7 rounded-b-[3px] bg-sk-brand transition-[left] duration-[440ms] ease-spring"
        style={{ left: `calc(8px + (100% - 16px) * ${(index + 0.5) / 4} - 14px)` }}
      />
      {TABS.map(({ href, label, Icon }, tab) => {
        const on = tab === index;
        return (
          <Link
            key={href}
            href={href}
            aria-current={on ? 'page' : undefined}
            className={`flex h-[54px] flex-col items-center justify-center gap-1 text-[11px] transition-colors duration-200 ${
              on ? 'font-extrabold text-sk-ink' : 'font-semibold text-sk-ink3'
            }`}
          >
            <Icon size={22} strokeWidth={2} aria-hidden />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
