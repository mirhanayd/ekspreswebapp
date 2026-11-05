import type { Metadata, Viewport } from 'next';
import { Archivo } from 'next/font/google';
import { cookies } from 'next/headers';
import './globals.css';
import { ACCESS_TOKEN_COOKIE } from '@/lib/auth';
import { NavProvider } from '@/components/nav/NavProvider';
import { TabBar } from '@/components/nav/TabBar';
import { NotificationProvider } from '@/components/notifications/NotificationProvider';
import { AlightingBanner } from '@/components/notifications/AlightingBanner';
import { NotificationSettingsSheet } from '@/components/notifications/NotificationSettingsSheet';

// The width axis powers the wide numerals (clock times, kilometres, prices).
const archivo = Archivo({
  subsets: ['latin', 'latin-ext'],
  axes: ['wdth'],
  variable: '--font-archivo',
  display: 'swap',
});

export const metadata: Metadata = {
  title: { default: 'Siirt Kurtalan Ekspres', template: '%s | Siirt Kurtalan Ekspres' },
  description:
    'Siirt, Kurtalan ve bölge hatlarında online otobüs bileti, gerçek koltuk seçimi, canlı sefer takibi ve iniş bildirimleri.',
  applicationName: 'Siirt Kurtalan Ekspres',
  manifest: '/manifest.webmanifest',
  icons: {
    icon: [{ url: '/icons/favicon-32.png', sizes: '32x32', type: 'image/png' }],
    apple: [{ url: '/icons/apple-touch-icon.png', sizes: '180x180' }],
  },
  appleWebApp: { capable: true, title: 'SK Ekspres', statusBarStyle: 'default' },
};

export const viewport: Viewport = {
  themeColor: '#F1F1EF',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

/**
 * App shell: a phone-width column with a bottom tab bar on the four tab roots.
 * Each route owns its own top row, so there is no site header.
 */
export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const authenticated = (await cookies()).has(ACCESS_TOKEN_COOKIE);

  return (
    <html lang="tr" suppressHydrationWarning>
      <body className={`${archivo.variable} min-h-[100dvh] font-sans antialiased`}>
        <a
          href="#icerik"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[80] focus:rounded-full focus:bg-sk-dark focus:px-5 focus:py-3 focus:text-sm focus:font-bold focus:text-white"
        >
          İçeriğe geç
        </a>
        <NavProvider>
          <NotificationProvider authenticated={authenticated}>
            <div className="app">
              <main id="icerik">{children}</main>
            </div>
            <TabBar />
            <AlightingBanner />
            <NotificationSettingsSheet />
          </NotificationProvider>
        </NavProvider>
      </body>
    </html>
  );
}
