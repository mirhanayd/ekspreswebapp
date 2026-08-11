import type { Metadata, Viewport } from 'next';
import { Archivo, Inter } from 'next/font/google';
import { cookies } from 'next/headers';
import './globals.css';
import { ACCESS_TOKEN_COOKIE } from '@/lib/auth';
import { BottomNav } from '@/components/BottomNav';
import { SiteFooter } from '@/components/SiteFooter';
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
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-3 focus:z-[60] focus:rounded-full focus:bg-white focus:px-4 focus:py-2 focus:text-sm focus:font-bold focus:text-ink-900"
        >
          İçeriğe geç
        </a>

        <SiteHeader authenticated={authenticated} />

        <main id="icerik" className="flex-1">
          {children}
        </main>

        <SiteFooter />
        <BottomNav authenticated={authenticated} />
      </body>
    </html>
  );
}
