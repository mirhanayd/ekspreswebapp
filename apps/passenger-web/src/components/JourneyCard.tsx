import Link from 'next/link';
import { ArrowRight, BusFront } from 'lucide-react';
import { formatPrice, formatTime, placeShortName } from '@/lib/format';

export type JourneyFact = { label: string; value: string };

/**
 * Search result card, reproduced from `ui/trip-search-reference.png`:
 * a 310x231 card split into a 63px lime rail carrying a rotated wordmark and a
 * dark circular vehicle badge, a white journey block (codes + cities over
 * times + dates), and a 76px #FFFA93 facts strip.
 *
 * The price/CTA band below the strip is the one addition the reference does not
 * show — it is required to book and keeps the same stacked-band composition.
 */
export function JourneyCard({
  href,
  originName,
  destinationName,
  departureTime,
  arrivalTime,
  price,
  facts,
  badge,
  cta = 'Seferi seç',
}: {
  href: string;
  originName: string;
  destinationName: string;
  departureTime: string;
  arrivalTime: string;
  price: number;
  facts: [JourneyFact, JourneyFact, JourneyFact];
  badge?: string;
  cta?: string;
}) {
  return (
    <article className="overflow-hidden rounded-card bg-white shadow-card">
      <div className="flex">
        <div className="rail" aria-hidden>
          <span className="rail-label">Ekspres</span>
          <span className="grid h-9 w-9 place-items-center rounded-full bg-ink-900 text-white">
            <BusFront className="h-[1.125rem] w-[1.125rem]" />
          </span>
        </div>

        <div className="min-w-0 flex-1 px-4 py-4 sm:px-5">
          {badge ? (
            <p className="mb-3">
              <span className="badge badge-lime">{badge}</span>
            </p>
          ) : null}

          <div className="journey-row">
            <div className="journey-from">
              <p className="code-xl truncate">{placeShortName(originName)}</p>
              <p className="caption mt-1 truncate">{originName}</p>
            </div>
            <span className="journey-badge" aria-hidden>
              <BusFront className="h-4 w-4" />
            </span>
            <div className="journey-to">
              <p className="code-xl truncate">{placeShortName(destinationName)}</p>
              <p className="caption mt-1 truncate">{destinationName}</p>
            </div>
          </div>

          <div className="mt-5 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="num font-display text-xl font-bold leading-none text-ink-900">
                {formatTime(departureTime)}
              </p>
              <p className="caption mt-1.5 truncate">{dayLabel(departureTime)}</p>
            </div>
            <div className="min-w-0 text-right">
              <p className="num font-display text-xl font-bold leading-none text-ink-900">
                {formatTime(arrivalTime)}
              </p>
              <p className="caption mt-1.5 truncate">{dayLabel(arrivalTime)}</p>
            </div>
          </div>
        </div>
      </div>

      <dl className="facts-strip">
        {facts.map((fact) => (
          <div key={fact.label} className="fact">
            <dt className="fact-label">{fact.label}</dt>
            <dd className="fact-value">{fact.value}</dd>
          </div>
        ))}
      </dl>

      <div className="flex items-center justify-between gap-3 px-4 py-3.5 sm:px-5">
        <p className="min-w-0">
          <span className="block text-[0.6875rem] font-semibold text-ink-500">Yolcu başına</span>
          <span className="num block font-display text-xl font-bold text-ink-900">
            {formatPrice(price)}
          </span>
        </p>
        <Link href={href} className="btn btn-primary btn-sm shrink-0 px-5">
          {cta}
          <ArrowRight className="h-4 w-4" aria-hidden />
        </Link>
      </div>
    </article>
  );
}

/** "Sal, 12 Ağu" — the short day label printed under each time in /ui. */
function dayLabel(value: string) {
  return new Date(value).toLocaleDateString('tr-TR', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}
