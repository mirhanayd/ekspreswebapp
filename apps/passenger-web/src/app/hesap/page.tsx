import Link from 'next/link';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { ChevronRight, Radio, Route, ShieldCheck, Ticket, UserRound } from 'lucide-react';
import { ACCESS_TOKEN_COOKIE } from '@/lib/auth';
import { LogoutButton } from '@/components/LogoutButton';

export const metadata = { title: 'Hesabım' };

const shortcuts = [
  { href: '/tickets', label: 'Biletlerim', hint: 'QR kodun ve aktif yolculukların', icon: Ticket },
  { href: '/search', label: 'Sefer ara', hint: 'Yeni bir yolculuk planla', icon: Route },
  { href: '/canli', label: 'Canlı takip', hint: 'Yoldaki otobüsü haritada izle', icon: Radio },
];

export default async function AccountPage() {
  const authenticated = (await cookies()).has(ACCESS_TOKEN_COOKIE);
  if (!authenticated) redirect('/login?returnTo=/hesap');

  return (
    <div className="canvas-sage min-h-[100dvh]">
      <div className="screen screen-pad">
        <div className="top-row">
          <p className="font-display text-[1.375rem] font-bold text-ink-900">Hesabım</p>
          <span className="badge badge-lime">
            <ShieldCheck className="h-3 w-3" aria-hidden />
            Oturum açık
          </span>
        </div>

        <h1 className="sr-only">Hesabım</h1>

        <div className="mt-7 flex items-center gap-4 rounded-card bg-white p-5 shadow-card">
          <span className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-lime-400 text-ink-900">
            <UserRound className="h-6 w-6" aria-hidden />
          </span>
          <div className="min-w-0">
            <p className="font-display text-[1.0625rem] font-bold text-ink-900">Ekspres yolcusu</p>
            <p className="caption truncate">Güvenli oturum ile giriş yapıldı</p>
          </div>
        </div>

        <ul className="mt-3 grid gap-2.5">
          {shortcuts.map(({ href, label, hint, icon: Icon }) => (
            <li key={href}>
              <Link href={href} className="card-link flex items-center gap-3.5 p-4">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-[1.125rem] bg-cream-200 text-ink-700">
                  <Icon className="h-[1.125rem] w-[1.125rem]" aria-hidden />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-display text-[0.9375rem] font-bold text-ink-900">
                    {label}
                  </span>
                  <span className="caption block truncate">{hint}</span>
                </span>
                <ChevronRight className="h-5 w-5 shrink-0 text-ink-300" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>

        <p className="subtle mt-6">
          Biletlerin ve yolculuk geçmişin bu hesaba bağlıdır. Cihazını paylaşıyorsan işin bittiğinde
          çıkış yapmayı unutma.
        </p>

        <div className="mt-5">
          <LogoutButton variant="light" />
        </div>
      </div>
    </div>
  );
}
