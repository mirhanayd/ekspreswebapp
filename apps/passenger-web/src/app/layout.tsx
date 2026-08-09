import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  title: 'Siirt Kurtalan Ekspres - Passenger',
  description: 'Demo MVP passenger application',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${inter.variable} font-sans antialiased min-h-screen bg-background flex flex-col`}
      >
        <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="container flex h-14 items-center">
            <div className="mr-4 flex w-full justify-between md:justify-start">
              <a className="mr-6 flex items-center space-x-2" href="/">
                <span className="font-bold inline-block">Siirt Kurtalan Ekspres</span>
              </a>
              <nav className="flex items-center space-x-6 text-sm font-medium">
                <a
                  href="/tickets"
                  className="transition-colors hover:text-foreground/80 text-foreground/60"
                >
                  Biletlerim
                </a>
              </nav>
            </div>
          </div>
        </header>
        <main className="flex-1">{children}</main>
      </body>
    </html>
  );
}
