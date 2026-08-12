'use client';

import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { isoDate } from '@/lib/format';

const WEEKDAYS = ['Pt', 'Sa', 'Ça', 'Pe', 'Cu', 'Ct', 'Pz'];

function toIso(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate(),
  ).padStart(2, '0')}`;
}

/** Monday-first grid for the month containing `cursor`. */
function monthGrid(cursor: Date) {
  const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
  const lead = (first.getDay() + 6) % 7; // Sunday is 0, we want Monday first
  const days = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate();

  const cells: Array<Date | null> = Array.from({ length: lead }, () => null);
  for (let day = 1; day <= days; day += 1) {
    cells.push(new Date(cursor.getFullYear(), cursor.getMonth(), day));
  }
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

/**
 * The app's own calendar. The native date input has no styling surface, so the
 * date picker is drawn here in the same vocabulary as the rest of the app: a
 * lime selected day, a near-black ring on today, and past days quietly muted.
 */
export function Calendar({
  value,
  onSelect,
  monthsAhead = 6,
}: {
  value: string;
  onSelect: React.Dispatch<string>;
  monthsAhead?: number;
}) {
  const today = isoDate(0);
  const selected = value || today;
  const [cursor, setCursor] = useState(() => {
    const [year, month] = selected.split('-').map(Number);
    return new Date(year, (month || 1) - 1, 1);
  });

  const cells = useMemo(() => monthGrid(cursor), [cursor]);

  const firstMonth = new Date();
  firstMonth.setDate(1);
  const lastMonth = new Date(firstMonth);
  lastMonth.setMonth(lastMonth.getMonth() + monthsAhead);

  const canGoBack = cursor > new Date(firstMonth.getFullYear(), firstMonth.getMonth(), 1);
  const canGoForward = cursor < new Date(lastMonth.getFullYear(), lastMonth.getMonth(), 1);

  const shift = (months: number) =>
    setCursor((current) => new Date(current.getFullYear(), current.getMonth() + months, 1));

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => shift(-1)}
          disabled={!canGoBack}
          aria-label="Önceki ay"
          className="icon-btn icon-btn-sm bg-ink-900/[0.06] text-ink-700 transition hover:bg-ink-900/10 disabled:opacity-35"
        >
          <ChevronLeft className="h-5 w-5" aria-hidden />
        </button>

        <p
          aria-live="polite"
          className="font-display text-[1.0625rem] font-bold capitalize text-ink-900"
        >
          {cursor.toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' })}
        </p>

        <button
          type="button"
          onClick={() => shift(1)}
          disabled={!canGoForward}
          aria-label="Sonraki ay"
          className="icon-btn icon-btn-sm bg-ink-900/[0.06] text-ink-700 transition hover:bg-ink-900/10 disabled:opacity-35"
        >
          <ChevronRight className="h-5 w-5" aria-hidden />
        </button>
      </div>

      <div className="mt-4 grid grid-cols-7 gap-1">
        {WEEKDAYS.map((day) => (
          <span
            key={day}
            className="py-1 text-center text-[0.6875rem] font-semibold uppercase text-ink-400"
          >
            {day}
          </span>
        ))}

        {cells.map((date, index) => {
          if (!date) return <span key={`pad-${index}`} aria-hidden />;
          const iso = toIso(date);
          const isPast = iso < today;
          const isSelected = iso === selected;
          const isToday = iso === today;

          return (
            <button
              key={iso}
              type="button"
              disabled={isPast}
              aria-pressed={isSelected}
              aria-label={date.toLocaleDateString('tr-TR', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
              })}
              onClick={() => onSelect(iso)}
              className={`num grid aspect-square place-items-center rounded-full text-[0.9375rem] font-semibold transition ${
                isSelected
                  ? 'bg-lime-500 text-ink-900'
                  : isPast
                    ? 'text-ink-300'
                    : 'text-ink-800 hover:bg-cream-200'
              } ${isToday && !isSelected ? 'ring-1 ring-inset ring-ink-900/25' : ''}`}
            >
              {date.getDate()}
            </button>
          );
        })}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {[
          { label: 'Bugün', offset: 0 },
          { label: 'Yarın', offset: 1 },
          { label: 'Hafta sonu', offset: nextWeekendOffset() },
        ].map(({ label, offset }) => {
          const iso = isoDate(offset);
          return (
            <button
              key={label}
              type="button"
              onClick={() => onSelect(iso)}
              aria-pressed={selected === iso}
              className={`chip chip-sm ${selected === iso ? 'chip-active' : 'chip-flat'}`}
            >
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** Days until the coming Saturday (today counts when it is already Saturday). */
function nextWeekendOffset() {
  const day = new Date().getDay();
  return (6 - day + 7) % 7;
}
