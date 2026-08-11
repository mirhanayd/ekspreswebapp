import type { Metadata, Viewport } from 'next';
import { Archivo, Inter } from 'next/font/google';
import Image from 'next/image';
import Link from 'next/link';
import { cookies } from 'next/headers';
import { LogOut, ShieldCheck } from 'lucide-react';
import { ADMIN_ACCESS_TOKEN_COOKIE } from '@/lib/auth';
import { AdminNav } from '@/components/AdminNav';
import './globals.css';

const inter = Inter({ subsets: ['latin', 'latin-ext'], variable: '--font-inter', display: 'swap' });
const display = Archivo({
  subsets: ['latin', 'latin-ext'],
  variable: '--font-display',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Operasyon Merkezi | Siirt Kurtalan Ekspres',
  description: 'Siirt Kurtalan Ekspres sefer, bilet ve filo operasyon merkezi.',
};

export const viewport: Viewport = { themeColor: '#12100E' };

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const authenticated = (await cookies()).has(ADMIN_ACCESS_TOKEN_COOKIE);

  return (
    <html lang="tr" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${display.variable} min-h-screen bg-background font-sans text-ink-900 antialiased`}
      >
        {!authenticated ? (
          children
        ) : (
          <div className="min-h-screen md:grid md:grid-cols-[16rem_1fr]">
            <aside className="bg-ink-950 text-white md:sticky md:top-0 md:flex md:h-screen md:flex-col md:border-r md:border-white/10">
              <div className="flex items-center gap-3 border-b border-white/10 px-4 py-4">
                <span className="grid shrink-0 place-items-center rounded-lg bg-white p-1 ring-1 ring-black/5">
                  <Image
                    src="/brand/logo.png"
                    alt="Siirt Kurtalan Ekspres"
                    width={92}
                    height={37}
                    priority
                  />
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-2xs font-bold uppercase tracking-[0.16em] text-brand-300">
                    Operasyon
                  </span>
                  <span className="block truncate text-sm font-bold">Merkezi</span>
                </span>
              </div>

              <div className="md:flex-1 md:overflow-y-auto">
                <AdminNav />
              </div>

              <div className="hidden border-t border-white/10 p-4 md:block">
                <p className="flex items-center gap-2 text-2xs font-semibold text-ink-400">
                  <ShieldCheck className="h-3.5 w-3.5 text-brand-400" aria-hidden />
                  Yetkili yönetici oturumu
                </p>
              </div>
            </aside>

            <div className="min-w-0">
              <header className="sticky top-0 z-30 flex h-[var(--admin-header-h)] items-center justify-between gap-3 border-b border-ink-200 bg-white/95 px-4 backdrop-blur md:px-6">
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-ink-900">Operasyon Merkezi</p>
                  <p className="truncate text-2xs text-ink-500">
                    PostgreSQL işlem verisi · Redis canlı konum
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Link href="/dashboard" className="ops-btn ops-btn-secondary hidden sm:inline-flex">
                    Panele dön
                  </Link>
                  <form action="/api/auth/logout" method="post">
                    <button type="submit" className="ops-btn ops-btn-secondary">
                      <LogOut className="h-4 w-4" aria-hidden />
                      <span className="hidden sm:inline">Çıkış</span>
                    </button>
                  </form>
                </div>
              </header>

              <main className="p-4 md:p-6 lg:p-8">{children}</main>
            </div>
          </div>
        )}
      </body>
    </html>
  );
}
