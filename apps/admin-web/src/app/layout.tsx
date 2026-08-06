import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Siirt Kurtalan Ekspres - Admin',
  description: 'Demo MVP admin application',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <div style={{ maxWidth: '800px', margin: '0 auto', padding: '2rem' }}>{children}</div>
      </body>
    </html>
  );
}
