import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { BrandMark } from './BrandLogo';

/**
 * Sign in / sign up. No direct reference screen, so the layout borrows the home
 * composition from `ui/mobile-home-reference.png`: sage canvas, a circular back
 * control, a small tracked eyebrow over an oversized display heading, and the
 * coach photograph as a rounded hero card. Wide viewports place that hero
 * alongside the form instead of above it.
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
    <div className="canvas-sage min-h-[100dvh]">
      <div className="screen screen-pad lg:max-w-5xl">
        <div className="top-row">
          <Link href="/" aria-label="Ana sayfaya dön" className="icon-btn icon-btn-white">
            <ArrowLeft className="h-5 w-5" aria-hidden />
          </Link>
          <BrandMark className="w-28" />
          <span className="h-14 w-14 shrink-0" aria-hidden />
        </div>

        <div className="mt-8 lg:grid lg:grid-cols-2 lg:items-center lg:gap-10">
          <figure className="relative order-last hidden overflow-hidden rounded-[2rem] bg-ink-900 lg:block">
            <Image
              src="/brand/coach.jpg"
              alt=""
              fill
              sizes="50vw"
              aria-hidden
              className="object-cover"
            />
            <div className="absolute inset-0 bg-hero-scrim" aria-hidden />
            <figcaption className="relative flex min-h-[26rem] flex-col justify-end p-7 text-white">
              <p className="font-display text-[1.75rem] font-bold leading-tight">
                Biletin, koltuğun ve canlı yolculuğun tek hesapta.
              </p>
              <ul className="mt-5 space-y-2 text-[0.8125rem] text-white/75">
                {highlights.map((item) => (
                  <li key={item} className="flex items-center gap-2.5">
                    <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-lime-400" aria-hidden />
                    {item}
                  </li>
                ))}
              </ul>
            </figcaption>
          </figure>

          <div className="min-w-0">
            <p className="eyebrow">{eyebrow}</p>
            <h1 className="display-1 mt-2 text-[2.25rem] sm:text-[2.75rem]">{title}</h1>
            <p className="subtle mt-3 max-w-sm">{description}</p>

            <div className="card card-pad mt-7">{children}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
