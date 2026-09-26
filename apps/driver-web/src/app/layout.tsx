import type { Metadata, Viewport } from 'next';
import './globals.css';
import './presentation.css';
import './driver-redesign.css';

export const metadata: Metadata = {
  title: 'Siirt Kurtalan Ekspres | Sürücü',
  description: 'Sürücü operasyon uygulaması',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#E8F3E9',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="tr">
      <body>{children}</body>
    </html>
  );
}
