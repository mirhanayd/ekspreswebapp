'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Activity,
  BusFront,
  ChartNoAxesCombined,
  LayoutDashboard,
  type LucideIcon,
  Ticket,
  UserCog,
} from 'lucide-react';

export type NavItem = { href: string; label: string; icon: LucideIcon; match?: string };

export const navigation: Array<{ group: string; items: NavItem[] }> = [
  {
    group: 'Genel',
    items: [{ href: '/dashboard', label: 'Genel bakış', icon: LayoutDashboard }],
  },
  {
    group: 'Operasyon',
    items: [
      { href: '/operations/trips', label: 'Seferler', icon: BusFront },
      { href: '/operations/fleet', label: 'Canlı filo', icon: Activity },
    ],
  },
  {
    group: 'Satış',
    items: [
      { href: '/tickets', label: 'Biletler', icon: Ticket },
      { href: '/reports', label: 'Raporlar', icon: ChartNoAxesCombined },
    ],
  },
  {
    group: 'Sistem',
    items: [
      {
        href: '/operations/trips#surucu-hesaplari',
        label: 'Şoför hesapları',
        icon: UserCog,
        match: '/__never__',
      },
    ],
  },
];

export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Operasyon menüsü"
      className="no-scrollbar flex gap-1 overflow-x-auto px-3 pb-3 md:block md:space-y-5 md:overflow-visible md:px-3 md:py-4"
    >
      {navigation.map((section) => (
        <div key={section.group} className="flex shrink-0 gap-1 md:block">
          <p className="hidden px-3 pb-1.5 text-xs font-medium text-adm-muted md:block">
            {section.group}
          </p>
          <ul className="flex gap-1 md:block md:space-y-0.5">
            {section.items.map(({ href, label, icon: Icon, match }) => {
              const active = pathname.startsWith(match ?? href);
              return (
                <li key={href}>
                  <Link
                    href={href}
                    aria-current={active ? 'page' : undefined}
                    className={`flex h-10 shrink-0 items-center gap-2.5 whitespace-nowrap rounded-btn px-3 text-sm font-medium transition ${
                      active
                        ? 'bg-adm-sel-bg text-adm-sel-text'
                        : 'text-adm-muted hover:bg-adm-bg hover:text-adm-text'
                    }`}
                  >
                    <Icon className="h-4 w-4 shrink-0" aria-hidden />
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
