import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft, CircleCheck } from 'lucide-react';
import { BrandMark } from './BrandLogo';

/**
 * Shared split layout for sign in / sign up: brand story on the left,
 * a focused form on the right. Mobile keeps only the form plus a compact
 * branded header so the keyboard never fights for space.
 */
export function AuthShell({
  eyebrow,
  title,
  description,
  highlights,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  highlights: string[];
  children: React.ReactNode;
}) {
  return (
    <div className="grid min-h-[calc(100dvh-var(--app-header-h)-var(--app-nav-h))] lg:grid-cols-2">
      <section className="relative hidden overflow-hidden bg-ink-gradient p-10 text-white lg:flex lg:flex-col lg:justify-between xl:p-14">
        <Image
          src="/brand/coach.jpg"
          alt=""
          fill
          sizes="50vw"
          aria-hidden
          className="object-cover opacity-25"
        />
        <div
          className="absolute inset-0 bg-gradient-to-br from-ink-950 via-ink-950/85 to-brand-900/70"
          aria-hidden
        />

        <Link href="/" className="relative inline-flex w-fit">
          <BrandMark className="w-36" tone="light" />
        </Link>

        <div className="relative">
          <p className="eyebrow-invert">Yolculuğun devam ediyor</p>
          <p className="mt-4 max-w-lg font-display text-4xl font-extrabold leading-[1.1] tracking-tight xl:text-5xl">
            Biletin, koltuğun ve canlı yolculuğun tek hesapta.
          </p>
          <ul className="mt-8 space-y-3">
            {highlights.map((item) => (
              <li key={item} className="flex items-center gap-2.5 text-ink-200">
                <CircleCheck className="h-5 w-5 shrink-0 text-brand-400" aria-hidden />
                {item}
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-2xs text-ink-400">
          Siirt Kurtalan Ekspres · Şehirlerarası yolcu taşımacılığı
        </p>
      </section>

      <section className="grid place-items-center px-4 py-10 sm:px-8">
        <div className="w-full max-w-md">
          <Link href="/" className="link-quiet inline-flex items-center gap-1.5 text-sm lg:hidden">
            <ArrowLeft className="h-4 w-4" aria-hidden />
            Ana sayfa
          </Link>

          <div className="mt-6 lg:mt-0">
            <p className="eyebrow">{eyebrow}</p>
            <h1 className="title-lg mt-1.5">{title}</h1>
            <p className="subtle mt-2">{description}</p>
          </div>

          <div className="mt-6">{children}</div>
        </div>
      </section>
    </div>
  );
}
