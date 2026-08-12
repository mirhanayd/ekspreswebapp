import type { Metadata, Viewport } from 'next';
import { Archivo, Inter } from 'next/font/google';
import { cookies } from 'next/headers';
import './globals.css';
import { ACCESS_TOKEN_COOKIE } from '@/lib/auth';
import { BottomNav } from '@/components/BottomNav';
import { TopNav } from '@/components/TopNav';

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
  themeColor: '#E8F3E9',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

/**
 * App shell. The reference screens are headerless phone views on a tinted
 * canvas with a floating tab pill, so there is no site header or footer here —
 * each route owns its own top row.
 */
export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const authenticated = (await cookies()).has(ACCESS_TOKEN_COOKIE);

  return (
    <html lang="tr" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${display.variable} min-h-[100dvh] font-sans antialiased`}
      >
        <a
          href="#icerik"
          className="sr-only focus:not-sr-only focus:absolute focus:left-5 focus:top-4 focus:z-[60] focus:rounded-full focus:bg-ink-900 focus:px-5 focus:py-3 focus:text-sm focus:font-semibold focus:text-white"
        >
          İçeriğe geç
        </a>

        <TopNav authenticated={authenticated} />

        {/* The rail floats over the page canvas rather than banding across it,
            so each route keeps its own sage or cream ground edge to edge. */}
        <main id="icerik" className="lg:-mt-[var(--app-header-h)]">
          {children}
        </main>

        <BottomNav authenticated={authenticated} />
      </body>
    </html>
  );
}
