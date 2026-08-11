'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Activity,
  BusFront,
  ChartNoAxesCombined,
  LayoutDashboard,
  Ticket,
} from 'lucide-react';

const navigation = [
  {
    group: 'Genel',
    items: [{ href: '/dashboard', label: 'Genel Bakış', icon: LayoutDashboard }],
  },
  {
    group: 'Operasyon',
    items: [
      { href: '/operations/trips', label: 'Ulaşım Operasyonları', icon: BusFront },
      { href: '/operations/fleet', label: 'Canlı Filo', icon: Activity },
    ],
  },
  {
    group: 'Satış',
    items: [
      { href: '/tickets', label: 'Biletler', icon: Ticket },
      { href: '/reports', label: 'Raporlar', icon: ChartNoAxesCombined },
    ],
  },
];

export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Operasyon menüsü"
      className="flex gap-1 overflow-x-auto p-3 md:block md:space-y-5 md:overflow-visible md:p-4"
    >
      {navigation.map((section) => (
        <div key={section.group} className="flex gap-1 md:block">
          <p className="hidden px-3 pb-2 text-2xs font-bold uppercase tracking-[0.16em] text-ink-500 md:block">
            {section.group}
          </p>
          <ul className="flex gap-1 md:block md:space-y-1">
            {section.items.map(({ href, label, icon: Icon }) => {
              const active = pathname.startsWith(href);
              return (
                <li key={href}>
                  <Link
                    href={href}
                    aria-current={active ? 'page' : undefined}
                    className={`flex min-h-10 shrink-0 items-center gap-2.5 whitespace-nowrap rounded-full px-3.5 text-sm font-semibold transition ${
                      active
                        ? 'bg-brand-700 text-white shadow-brand'
                        : 'text-ink-300 hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    <Icon
                      className={`h-4 w-4 shrink-0 ${active ? 'text-white' : 'text-brand-400'}`}
                      aria-hidden
                    />
                    {label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}
