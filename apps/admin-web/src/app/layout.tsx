import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import Link from 'next/link';
import { cookies } from 'next/headers';
import {
  Activity,
  BusFront,
  ChartNoAxesCombined,
  LayoutDashboard,
  LogOut,
  Ticket,
} from 'lucide-react';
import { ADMIN_ACCESS_TOKEN_COOKIE } from '@/lib/auth';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  title: 'Siirt Kurtalan Ekspres | Operasyon Merkezi',
  description: 'Siirt Kurtalan Ekspres demo operasyon merkezi',
};

const navigation = [
  { href: '/dashboard', label: 'Genel Bakış', icon: LayoutDashboard },
  { href: '/operations/trips', label: 'Ulaşım Operasyonları', icon: BusFront },
  { href: '/tickets', label: 'Biletler', icon: Ticket },
  { href: '/operations/fleet', label: 'Canlı Filo', icon: Activity },
  { href: '/reports', label: 'Raporlar', icon: ChartNoAxesCombined },
];

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const authenticated = (await cookies()).has(ADMIN_ACCESS_TOKEN_COOKIE);

  return (
    <html lang="tr" suppressHydrationWarning>
      <body
        className={`${inter.variable} min-h-screen bg-slate-50 font-sans text-slate-950 antialiased`}
      >
        {!authenticated ? (
          children
        ) : (
          <div className="min-h-screen md:grid md:grid-cols-[260px_1fr]">
            <aside className="border-b bg-slate-950 text-white md:min-h-screen md:border-b-0 md:border-r md:border-slate-800">
              <div className="border-b border-slate-800 px-5 py-5">
                <Link href="/dashboard" className="block">
                  <span className="text-xs font-bold uppercase tracking-[0.2em] text-red-400">
                    Siirt Kurtalan
                  </span>
                  <span className="mt-1 block text-xl font-black">Ekspres Operasyon</span>
                </Link>
              </div>
              <nav className="flex gap-1 overflow-x-auto p-3 md:grid md:overflow-visible md:p-4">
                {navigation.map(({ href, label, icon: Icon }) => (
                  <Link
                    key={href}
                    href={href}
                    className="flex shrink-0 items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-300 transition hover:bg-slate-800 hover:text-white"
                  >
                    <Icon className="h-4 w-4 text-red-400" />
                    {label}
                  </Link>
                ))}
              </nav>
            </aside>
            <div className="min-w-0">
              <header className="flex h-16 items-center justify-between border-b bg-white px-4 md:px-6">
                <div>
                  <p className="text-sm font-semibold">Demo Operasyon Merkezi</p>
                  <p className="text-xs text-slate-500">PostgreSQL ve Redis çalışma verisi</p>
                </div>
                <form action="/api/auth/logout" method="post">
                  <button className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold hover:bg-slate-50">
                    <LogOut className="h-4 w-4" /> Çıkış
                  </button>
                </form>
              </header>
              <main className="p-4 md:p-6 lg:p-8">{children}</main>
            </div>
          </div>
        )}
      </body>
    </html>
  );
}
