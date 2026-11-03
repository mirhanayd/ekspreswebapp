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

/** The app's own calendar: a brand-red selected day, an ink ring on today, past days muted. */
export function Calendar({
  value,
  onSelect,
  monthsAhead = 6,
}: {
  value: string;
  onSelect: (iso: string) => void;
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
          className="round-btn border-0 bg-sk-bg disabled:opacity-35"
        >
          <ChevronLeft size={20} aria-hidden />
        </button>
        <p aria-live="polite" className="m-0 text-[17px] font-extrabold capitalize">
          {cursor.toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' })}
        </p>
        <button
          type="button"
          onClick={() => shift(1)}
          disabled={!canGoForward}
          aria-label="Sonraki ay"
          className="round-btn border-0 bg-sk-bg disabled:opacity-35"
        >
          <ChevronRight size={20} aria-hidden />
        </button>
      </div>

      <div className="mt-4 grid grid-cols-7 gap-1">
        {WEEKDAYS.map((day) => (
          <span key={day} className="py-1 text-center text-[11px] font-bold uppercase text-sk-ink3">
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
              className={`num-md grid aspect-square place-items-center rounded-full border-0 text-[15px] transition-colors ${
                isSelected
                  ? 'bg-sk-brand text-white'
                  : isPast
                    ? 'bg-transparent text-[#B9B9B3]'
                    : 'bg-transparent text-sk-ink hover:bg-sk-bg'
              } ${isToday && !isSelected ? 'ring-1 ring-inset ring-sk-ink/30' : ''}`}
            >
              {date.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
}
