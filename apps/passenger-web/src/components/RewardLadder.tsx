import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { rewardTiers } from '@/lib/campaigns';

/**
 * The three-step reward ladder: 25 ₺ at the first journey, 50 ₺ at the third,
 * 75 ₺ at the fifth.
 *
 * `reached` counts the steps the passenger has already passed and is derived
 * from their real ticket history, so with no journeys the bar sits empty rather
 * than showing invented progress.
 */
export function RewardLadder({
  reached = 0,
  tripCount = 0,
}: {
  reached?: number;
  tripCount?: number;
}) {
  const steps = rewardTiers.length;
  const next = rewardTiers.find((tier) => tripCount < tier.trips);
  // The filled track stops at the centre of the last reached node.
  const fill = reached <= 0 ? 0 : ((Math.min(reached, steps) - 0.5) / steps) * 100;

  return (
    <section aria-labelledby="odul-basligi" className="rounded-card bg-white p-5 shadow-card">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 id="odul-basligi" className="title-md">
            Yolculuk ödüllerin
          </h2>
          <p className="caption mt-1">
            {next
              ? `${next.trips - tripCount} yolculuk sonra ${next.amount} ₺ indirim.`
              : 'Tüm yolculuk ödüllerini kazandın.'}
          </p>
        </div>
        <Link
          href="/kampanyalar"
          aria-label="Kampanyaları gör"
          className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-ink-900/[0.06] text-ink-700 transition hover:bg-ink-900/10"
        >
          <ArrowRight className="h-4 w-4" aria-hidden />
        </Link>
      </div>

      <div className="relative mt-7">
        {/* Track */}
        <div className="absolute inset-x-0 top-[0.6875rem] h-1.5 rounded-full bg-ink-900/[0.08]">
          <div
            className="h-full rounded-full bg-lime-500 transition-[width] duration-700"
            style={{ width: `${fill}%` }}
          />
        </div>

        <ol className="relative grid grid-cols-3">
          {rewardTiers.map((tier, index) => {
            const done = index < reached;
            return (
              <li key={tier.amount} className="flex min-w-0 flex-col items-center text-center">
                <span
                  className={`grid h-6 w-6 place-items-center rounded-full ring-4 ring-white ${
                    done ? 'bg-lime-500' : 'bg-ink-900/[0.08]'
                  }`}
                >
                  <span
                    className={`h-2.5 w-2.5 rounded-full ${done ? 'bg-ink-900' : 'bg-ink-900/25'}`}
                  />
                </span>
                <span
                  className={`num mt-2.5 font-display text-[1.0625rem] font-bold ${
                    done ? 'text-ink-900' : 'text-ink-400'
                  }`}
                >
                  {tier.amount} ₺
                </span>
                <span className="caption mt-0.5 block max-w-[7rem] truncate">{tier.label}</span>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
