'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Headphones, MapPin, ShieldCheck } from 'lucide-react';
import { BrandMark } from './BrandLogo';

/** Live tracking fills the viewport, so the footer stands down on that route. */
export function SiteFooter() {
  const pathname = usePathname();
  if (pathname.includes('/live')) return null;

  return (
    <footer className="mt-auto border-t border-white/10 bg-ink-950 text-ink-300">
      <div className="shell-wide grid gap-8 py-10 sm:grid-cols-2 lg:grid-cols-4">
        <div className="sm:col-span-2 lg:col-span-1">
          <BrandMark size="sm" className="w-28" />
          <p className="mt-4 max-w-xs text-sm leading-6 text-ink-400">
            Siirt ve Kurtalan hatlarında şehirlerarası yolcu taşımacılığı. Bilet, koltuk ve canlı
            sefer takibi tek uygulamada.
          </p>
        </div>

        <FooterColumn title="Yolculuk">
          <FooterLink href="/#sefer-ara">Sefer ara</FooterLink>
          <FooterLink href="/tickets">Biletlerim</FooterLink>
          <FooterLink href="/#nasil-calisir">Nasıl çalışır?</FooterLink>
        </FooterColumn>

        <FooterColumn title="Hizmet">
          <li className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 shrink-0 text-brand-400" aria-hidden />
            Güvenli biletleme altyapısı
          </li>
          <li className="flex items-center gap-2">
            <MapPin className="h-4 w-4 shrink-0 text-brand-400" aria-hidden />
            Gerçek rota ve durak verisi
          </li>
          <li className="flex items-center gap-2">
            <Headphones className="h-4 w-4 shrink-0 text-brand-400" aria-hidden />
            Yolcu destek hattı
          </li>
        </FooterColumn>

        <FooterColumn title="Kurumsal">
          <li>Siirt Kurtalan Ekspres Turizm</li>
          <li>Siirt Otogarı, Siirt</li>
          <li className="text-ink-500">Demo sunum ortamı</li>
        </FooterColumn>
      </div>

      <div className="border-t border-white/10">
        <div className="shell-wide flex flex-col gap-2 py-5 text-xs text-ink-500 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} Siirt Kurtalan Ekspres. Tüm hakları saklıdır.</p>
          <p>Bu ortamda gerçek kart ve ödeme işlemi yapılmaz.</p>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-2xs font-bold uppercase tracking-[0.18em] text-white">{title}</p>
      <ul className="mt-4 space-y-2.5 text-sm text-ink-400">{children}</ul>
    </div>
  );
}

function FooterLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <li>
      <Link href={href} className="transition hover:text-white">
        {children}
      </Link>
    </li>
  );
}
