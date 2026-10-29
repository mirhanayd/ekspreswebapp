import type { Metadata, Viewport } from 'next';
import { IBM_Plex_Mono, IBM_Plex_Sans } from 'next/font/google';
import Image from 'next/image';
import { cookies } from 'next/headers';
import { Building2, LogOut } from 'lucide-react';
import { ADMIN_ACCESS_TOKEN_COOKIE } from '@/lib/auth';
import { requireAdminToken } from '@/lib/server-auth';
import { AdminNav } from '@/components/AdminNav';
import { AdminTopbar } from '@/components/AdminTopbar';
import { Avatar } from '@/components/ui';
import { initials } from '@/lib/trip-status';
import './globals.css';

const plexSans = IBM_Plex_Sans({
  subsets: ['latin', 'latin-ext'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-plex-sans',
  display: 'swap',
});
const plexMono = IBM_Plex_Mono({
  subsets: ['latin', 'latin-ext'],
  weight: ['400', '500', '600'],
  variable: '--font-plex-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Operasyon Merkezi | Siirt Kurtalan Ekspres',
  description: 'Siirt Kurtalan Ekspres sefer, bilet ve filo operasyon merkezi.',
};

export const viewport: Viewport = { themeColor: '#FFFFFF' };

async function currentAdmin(token: string | undefined) {
  if (!token) return null;
  try {
    return await requireAdminToken(token);
  } catch {
    // Pages redirect expired sessions themselves; the shell just renders without a user card.
    return null;
  }
}

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const token = (await cookies()).get(ADMIN_ACCESS_TOKEN_COOKIE)?.value;
  const admin = await currentAdmin(token);

  return (
    <html lang="tr" suppressHydrationWarning>
      <body
        className={`${plexSans.variable} ${plexMono.variable} min-h-screen bg-adm-bg font-sans text-adm-text antialiased`}
      >
        {!token ? (
          children
        ) : (
          <div className="min-h-screen md:grid md:grid-cols-[var(--admin-sidebar-w)_minmax(0,1fr)]">
            <aside className="border-b border-adm-line bg-white md:sticky md:top-0 md:flex md:h-screen md:flex-col md:border-b-0 md:border-r">
              <div className="flex items-center gap-3 px-4 pb-3 pt-4 md:px-5 md:pb-4 md:pt-5">
                <Image
                  src="/brand/logo.png"
                  alt="Siirt Kurtalan Ekspres"
                  width={104}
                  height={42}
                  priority
                />
                <span className="ml-auto rounded-md bg-adm-bg px-2 py-0.5 text-xs font-medium text-adm-muted md:hidden">
                  Operasyon
                </span>
              </div>

              <div className="hidden px-3 md:block">
                <label htmlFor="branch" className="sr-only">
                  Şube
                </label>
                <div className="relative">
                  <Building2
                    className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-adm-muted"
                    aria-hidden
                  />
                  <select id="branch" className="ops-field pl-9" defaultValue="siirt">
                    <option value="siirt">Siirt Merkez</option>
                  </select>
                </div>
              </div>

              <div className="min-w-0 md:flex-1 md:overflow-y-auto">
                <AdminNav />
              </div>

              <div className="hidden border-t border-adm-line p-3 md:block">
                <div className="flex items-center gap-3 rounded-card p-2">
                  <Avatar
                    name={admin ? initials(admin.firstName, admin.lastName) : 'Y'}
                    className="h-9 w-9 bg-adm-sel-bg text-adm-sel-text"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-adm-text">
                      {admin ? `${admin.firstName} ${admin.lastName}` : 'Yönetici'}
                    </p>
                    <p className="truncate text-xs text-adm-muted">
                      {admin?.email ?? 'Yetkili oturum'}
                    </p>
                  </div>
                  <form action="/api/auth/logout" method="post">
                    <button type="submit" className="ops-icon-btn border-0" aria-label="Çıkış yap">
                      <LogOut className="h-4 w-4" aria-hidden />
                    </button>
                  </form>
                </div>
              </div>
            </aside>

            <div className="min-w-0">
              <AdminTopbar />
              <main className="mx-auto max-w-[1440px] p-4 md:p-6 lg:p-8">{children}</main>
              <form action="/api/auth/logout" method="post" className="px-4 pb-6 md:hidden">
                <button type="submit" className="ops-btn ops-btn-secondary w-full">
                  <LogOut className="h-4 w-4" aria-hidden />
                  Çıkış yap
                </button>
              </form>
            </div>
          </div>
        )}
      </body>
    </html>
  );
}
