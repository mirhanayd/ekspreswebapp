import type { Metadata, Viewport } from 'next';
import { Archivo, Inter } from 'next/font/google';
import Link from 'next/link';
import { cookies } from 'next/headers';
import { Headphones, MapPin, ShieldCheck } from 'lucide-react';
import './globals.css';
import { ACCESS_TOKEN_COOKIE } from '@/lib/auth';
import { BottomNav } from '@/components/BottomNav';
import { BrandMark } from '@/components/BrandLogo';
import { SiteHeader } from '@/components/SiteHeader';

const inter = Inter({ subsets: ['latin', 'latin-ext'], variable: '--font-inter', display: 'swap' });
const display = Archivo({
  subsets: ['latin', 'latin-ext'],
  variable: '--font-display',
  display: 'swap',
});

export const metadata: Metadata = {
  title: { default: 'Siirt Kurtalan Ekspres', template: '%s | Siirt Kurtalan Ekspres' },
  description:
    'Siirt, Kurtalan ve bölge hatlarında online otobüs bileti, gerçek koltuk seçimi ve canlı sefer takibi.',
};

export const viewport: Viewport = {
  themeColor: '#12100E',
  width: 'device-width',
  initialScale: 1,
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const authenticated = (await cookies()).has(ACCESS_TOKEN_COOKIE);
  return (
    <html lang="tr" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${display.variable} flex min-h-screen flex-col pb-[var(--app-nav-h)] font-sans antialiased md:pb-0`}
      >
        <a
          href="#icerik"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-3 focus:z-[60] focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:text-sm focus:font-bold focus:text-ink-900"
        >
          İçeriğe geç
        </a>

        <SiteHeader authenticated={authenticated} />

        <main id="icerik" className="flex-1">
          {children}
        </main>

        <footer className="mt-auto border-t border-white/10 bg-ink-950 text-ink-300">
          <div className="shell-wide grid gap-8 py-10 sm:grid-cols-2 lg:grid-cols-4">
            <div className="sm:col-span-2 lg:col-span-1">
              <BrandMark size="sm" className="w-28" />
              <p className="mt-4 max-w-xs text-sm leading-6 text-ink-400">
                Siirt ve Kurtalan hatlarında şehirlerarası yolcu taşımacılığı. Bilet, koltuk ve
                canlı sefer takibi tek uygulamada.
              </p>
            </div>
            <FooterColumn title="Yolculuk">
              <FooterLink href="/#sefer-ara">Sefer ara</FooterLink>
              <FooterLink href="/tickets">Biletlerim</FooterLink>
              <FooterLink href="/#nasil-calisir">Nasıl çalışır?</FooterLink>
            </FooterColumn>
            <FooterColumn title="Hizmet">
              <li className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 shrink-0 text-brand-400" aria-hidden />
                Güvenli biletleme altyapısı
              </li>
              <li className="flex items-center gap-2">
                <MapPin className="h-4 w-4 shrink-0 text-brand-400" aria-hidden />
                Gerçek rota ve durak verisi
              </li>
              <li className="flex items-center gap-2">
                <Headphones className="h-4 w-4 shrink-0 text-brand-400" aria-hidden />
                Yolcu destek hattı
              </li>
            </FooterColumn>
            <FooterColumn title="Kurumsal">
              <li>Siirt Kurtalan Ekspres Turizm</li>
              <li>Siirt Otogarı, Siirt</li>
              <li className="text-ink-500">Demo sunum ortamı</li>
            </FooterColumn>
          </div>
          <div className="border-t border-white/10">
            <div className="shell-wide flex flex-col gap-2 py-5 text-xs text-ink-500 sm:flex-row sm:items-center sm:justify-between">
              <p>© {new Date().getFullYear()} Siirt Kurtalan Ekspres. Tüm hakları saklıdır.</p>
              <p>Bu ortamda gerçek kart ve ödeme işlemi yapılmaz.</p>
            </div>
          </div>
        </footer>

        <BottomNav authenticated={authenticated} />
      </body>
    </html>
  );
}

function FooterColumn({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-2xs font-bold uppercase tracking-[0.18em] text-white">{title}</p>
      <ul className="mt-4 space-y-2.5 text-sm text-ink-400">{children}</ul>
    </div>
  );
}

function FooterLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <li>
      <Link href={href} className="transition hover:text-white">
        {children}
      </Link>
    </li>
  );
}
