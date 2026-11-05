import type { Metadata, Viewport } from 'next';
import { Archivo } from 'next/font/google';
import { cookies } from 'next/headers';
import { authService } from '@ekspres/database';
import './globals.css';
import { DriverProvider, type DriverIdentity } from '@/components/DriverProvider';
import { PwaRegister } from '@/components/PwaRegister';
import { ACCESS_TOKEN_COOKIE } from '@/lib/auth';

// The width axis powers the wide clock figures.
const archivo = Archivo({
  subsets: ['latin', 'latin-ext'],
  axes: ['wdth'],
  variable: '--font-archivo',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Siirt Kurtalan Ekspres | Sürücü',
  description: 'Sürücü operasyon uygulaması',
  applicationName: 'SKE Sürücü',
  manifest: '/manifest.webmanifest',
  appleWebApp: { capable: true, title: 'SKE Sürücü', statusBarStyle: 'black-translucent' },
  icons: {
    icon: [
      { url: '/icons/favicon-32.png', sizes: '32x32', type: 'image/png' },
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
    ],
    apple: '/icons/apple-touch-icon.png',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#0D0E11',
  colorScheme: 'dark',
};

async function currentDriver(): Promise<DriverIdentity | null> {
  const token = (await cookies()).get(ACCESS_TOKEN_COOKIE)?.value;
  if (!token) return null;
  try {
    const user = await authService.session(token);
    return user.role === 'driver'
      ? { firstName: user.firstName, lastName: user.lastName, email: user.email }
      : null;
  } catch {
    // The client provider handles expired sessions via the API's 401 path.
    return null;
  }
}

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const driver = await currentDriver();
  return (
    <html lang="tr">
      <body className={archivo.variable}>
        <DriverProvider driver={driver}>{children}</DriverProvider>
        <PwaRegister />
      </body>
    </html>
  );
}
