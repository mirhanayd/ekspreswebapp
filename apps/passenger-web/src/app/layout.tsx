import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import Link from 'next/link';
import { cookies } from 'next/headers';
import { BusFront, Headphones, ShieldCheck, Ticket } from 'lucide-react';
import './globals.css';
import { ACCESS_TOKEN_COOKIE } from '@/lib/auth';
import { LogoutButton } from '@/components/LogoutButton';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  title: { default: 'Siirt Kurtalan Ekspres', template: '%s | Siirt Kurtalan Ekspres' },
  description: 'Siirt ve çevresinde güvenli, konforlu ve kolay otobüs bileti.',
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const authenticated = (await cookies()).has(ACCESS_TOKEN_COOKIE);
  return (
    <html lang="tr" suppressHydrationWarning>
      <body className={`${inter.variable} flex min-h-screen flex-col font-sans antialiased`}>
        <header className="sticky top-0 z-50 border-b border-slate-800 bg-slate-950 text-white shadow-lg shadow-slate-950/10">
          <div className="mx-auto flex h-[4.5rem] w-full max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
            <Link href="/" className="flex min-w-0 items-center gap-3" aria-label="Ana sayfa">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-red-700 shadow-inner">
                <BusFront className="h-6 w-6" />
              </span>
              <span className="min-w-0 leading-tight">
                <span className="block truncate text-[11px] font-black uppercase tracking-[0.2em] text-red-400">
                  Siirt Kurtalan
                </span>
                <span className="block truncate text-lg font-black">Ekspres</span>
              </span>
            </Link>
            <nav className="flex items-center gap-1 sm:gap-2" aria-label="Ana menü">
              <Link
                href="/#sefer-ara"
                className="hidden rounded-lg px-3 py-2 text-sm font-semibold text-slate-300 hover:bg-slate-800 hover:text-white sm:block"
              >
                Sefer Ara
              </Link>
              <Link
                href="/tickets"
                className="inline-flex min-h-11 items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-slate-200 hover:bg-slate-800 hover:text-white"
              >
                <Ticket className="h-4 w-4" />
                <span className="hidden sm:inline">Biletlerim</span>
              </Link>
              {authenticated ? (
                <LogoutButton />
              ) : (
                <Link
                  href="/login"
                  className="rounded-lg bg-red-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-red-800"
                >
                  Giriş
                </Link>
              )}
            </nav>
          </div>
        </header>
        <main className="flex-1">{children}</main>
        <footer className="border-t border-slate-800 bg-slate-950 text-slate-300">
          <div className="mx-auto grid max-w-7xl gap-5 px-4 py-7 text-sm sm:grid-cols-3 sm:px-6 lg:px-8">
            <div>
              <p className="font-black text-white">Siirt Kurtalan Ekspres</p>
              <p className="mt-1 text-xs text-slate-400">Yerel yolculuğun güvenilir adresi.</p>
            </div>
            <p className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-red-400" /> Güvenli demo biletleme
            </p>
            <p className="flex items-center gap-2 sm:justify-end">
              <Headphones className="h-4 w-4 text-red-400" /> Sunum destek hattı
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
