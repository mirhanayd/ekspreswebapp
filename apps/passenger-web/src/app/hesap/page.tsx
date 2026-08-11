import Link from 'next/link';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { ChevronRight, Radio, Search, ShieldCheck, Ticket, UserRound } from 'lucide-react';
import { ACCESS_TOKEN_COOKIE } from '@/lib/auth';
import { LogoutButton } from '@/components/LogoutButton';
import { BrandMark } from '@/components/BrandLogo';

export const metadata = { title: 'Hesabım' };

const shortcuts = [
  { href: '/tickets', label: 'Biletlerim', hint: 'QR kodun ve aktif yolculukların', icon: Ticket },
  { href: '/#sefer-ara', label: 'Sefer ara', hint: 'Yeni bir yolculuk planla', icon: Search },
  { href: '/#nasil-calisir', label: 'Nasıl çalışır?', hint: 'Üç adımda biletleme', icon: Radio },
];

export default async function AccountPage() {
  const authenticated = (await cookies()).has(ACCESS_TOKEN_COOKIE);
  if (!authenticated) redirect('/login?returnTo=/hesap');

  return (
    <div className="page shell">
      <div className="mx-auto max-w-xl">
        <div className="app-topbar">
          <BrandMark className="w-28" />
          <span className="badge badge-live">
            <ShieldCheck className="h-3 w-3" aria-hidden />
            Oturum açık
          </span>
        </div>

        <header className="mt-6">
          <p className="eyebrow">Yolcu hesabı</p>
          <h1 className="title-lg mt-1.5">Hesabım</h1>
          <p className="subtle mt-2">
            Biletlerin ve yolculuk geçmişin bu hesaba bağlıdır. Cihazını paylaşıyorsan işin
            bittiğinde çıkış yapmayı unutma.
          </p>
        </header>

        <div className="card mt-5 flex items-center gap-3 p-4">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-brand-50 text-brand-700 ring-1 ring-inset ring-brand-100">
            <UserRound className="h-5 w-5" aria-hidden />
          </span>
          <div className="min-w-0">
            <p className="font-display font-bold text-ink-900">Siirt Kurtalan Ekspres yolcusu</p>
            <p className="truncate text-sm text-ink-500">Güvenli oturum ile giriş yapıldı</p>
          </div>
        </div>

        <ul className="mt-3 grid gap-2.5">
          {shortcuts.map(({ href, label, hint, icon: Icon }) => (
            <li key={href}>
              <Link href={href} className="card-link flex items-center gap-3 p-4">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-ink-50 text-ink-700 ring-1 ring-inset ring-ink-100">
                  <Icon className="h-4 w-4" aria-hidden />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-display font-bold text-ink-900">{label}</span>
                  <span className="block truncate text-xs text-ink-500">{hint}</span>
                </span>
                <ChevronRight className="h-4 w-4 shrink-0 text-ink-400" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>

        <div className="mt-5 flex justify-center">
          <LogoutButton variant="light" />
        </div>
      </div>
    </div>
  );
}
