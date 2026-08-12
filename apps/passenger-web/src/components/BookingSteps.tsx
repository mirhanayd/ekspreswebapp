import { Check } from 'lucide-react';

const steps = ['Sefer', 'Koltuk', 'Yolcu & Ödeme', 'Bilet'];

/** Booking progress indicator shared by seat selection, checkout and confirmation. */
export function BookingSteps({ current }: { current: 1 | 2 | 3 | 4 }) {
  return (
    <ol
      className="flex items-center gap-1.5 sm:gap-2"
      aria-label={`Adım ${current} / ${steps.length}`}
    >
      {steps.map((label, index) => {
        const position = index + 1;
        const done = position < current;
        const active = position === current;
        return (
          <li key={label} className="flex min-w-0 flex-1 items-center gap-1.5 sm:gap-2">
            <span
              aria-current={active ? 'step' : undefined}
              className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-[0.6875rem] font-bold ${
                done
                  ? 'bg-lime-500 text-ink-900'
                  : active
                    ? 'bg-ink-900 text-white'
                    : 'bg-ink-900/[0.08] text-ink-500'
              }`}
            >
              {done ? <Check className="h-3.5 w-3.5" aria-hidden /> : position}
            </span>
            <span
              className={`hidden truncate text-xs font-semibold sm:block ${
                active ? 'text-ink-900' : 'text-ink-500'
              }`}
            >
              {label}
            </span>
            {position < steps.length ? (
              <span
                className={`h-0.5 min-w-2 flex-1 rounded ${done ? 'bg-lime-500' : 'bg-ink-900/10'}`}
                aria-hidden
              />
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}
