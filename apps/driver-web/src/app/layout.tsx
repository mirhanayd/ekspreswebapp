import type { Metadata, Viewport } from 'next';
import { Archivo, Inter } from 'next/font/google';
import './globals.css';
import './presentation.css';
import { DriverProvider } from '@/components/DriverProvider';

const inter = Inter({ subsets: ['latin', 'latin-ext'], variable: '--font-inter', display: 'swap' });
const display = Archivo({
  subsets: ['latin', 'latin-ext'],
  variable: '--font-display',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Siirt Kurtalan Ekspres | Sürücü',
  description: 'Sürücü operasyon uygulaması',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#13231c',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="tr">
      <body className={`${inter.variable} ${display.variable}`}><DriverProvider>{children}</DriverProvider></body>
    </html>
  );
}
