'use client';

import { useEffect, useRef, useState } from 'react';
import { ArrowRight, ArrowUpDown, CalendarDays, MapPin, X } from 'lucide-react';
import { BottomSheet } from '@/components/BottomSheet';
import { Calendar } from '@/components/Calendar';
import { useNav } from '@/components/nav/NavProvider';
import { formatDayMonth, isoDate } from '@/lib/format';

export type JourneyLocation = { id: string; name: string };
type Picker = null | 'origin' | 'destination' | 'date';

/**
 * The search card that overlaps the dark home header. Swapping origin and
 * destination spins the arrows half a turn while the two values slide past each
 * other; Today/Tomorrow are one-tap dates and the calendar covers the rest.
 */
export function JourneyCard({ locations }: { locations: JourneyLocation[] }) {
  const nav = useNav();
  const [originId, setOriginId] = useState(locations[0]?.id ?? '');
  const [destinationId, setDestinationId] = useState(locations[1]?.id ?? locations[0]?.id ?? '');
  // Dates come from the visitor's clock, so they are filled in after mount (the server's day may differ).
  const [clock, setClock] = useState<Date | null>(null);
  const [date, setDate] = useState('');
  const [picker, setPicker] = useState<Picker>(null);
  // 0 idle · 1 values leaving · 2 swapped, values waiting off-axis to settle back in
  const [phase, setPhase] = useState<0 | 1 | 2>(0);
  const [rotation, setRotation] = useState(0);
  const timers = useRef<number[]>([]);

  useEffect(() => () => timers.current.forEach((timer) => window.clearTimeout(timer)), []);
  useEffect(() => {
    setClock(new Date());
    setDate(isoDate(1));
  }, []);

  const origin = locations.find((location) => location.id === originId);
  const destination = locations.find((location) => location.id === destinationId);
  const today = clock ? isoDate(0) : '';
  const tomorrow = clock ? isoDate(1) : '';
  const customDate = Boolean(date) && date !== today && date !== tomorrow;

  function swap() {
    if (phase) return;
    setRotation((current) => current + 180);
    setPhase(1);
    timers.current.push(
      window.setTimeout(() => {
        setOriginId(destinationId);
        setDestinationId(originId);
        setPhase(2);
      }, 180),
      window.setTimeout(() => setPhase(0), 220),
    );
  }

  function choose(kind: 'origin' | 'destination', id: string) {
    if (kind === 'origin') {
      if (id === destinationId) setDestinationId(originId);
      setOriginId(id);
    } else {
      if (id === originId) setOriginId(destinationId);
      setDestinationId(id);
    }
    setPicker(null);
  }

  function search() {
    const params = new URLSearchParams({ date: date || isoDate(1) });
    if (originId) params.set('originId', originId);
    if (destinationId) params.set('destinationId', destinationId);
    nav.push(`/search?${params.toString()}`);
  }

  const valueStyle = (offset: number): React.CSSProperties => ({
    opacity: phase ? 0 : 1,
    transform: `translateY(${phase ? offset : 0}px)`,
    transition:
      phase === 2
        ? 'none'
        : phase === 1
          ? 'opacity 150ms ease, transform 180ms ease-in'
          : 'opacity 260ms ease, transform 380ms cubic-bezier(.22,1,.36,1)',
  });

  const days = [
    { key: 'today', id: today, label: 'Bugün', sub: clock ? formatDayMonth(clock) : ' ' },
    {
      key: 'tomorrow',
      id: tomorrow,
      label: 'Yarın',
      sub: clock ? formatDayMonth(new Date(clock.getTime() + 86_400_000)) : ' ',
    },
  ];

  return (
    <>
      <div
        className="relative -mt-[104px] mx-4 flex flex-col gap-1 rounded-[28px] bg-white px-2 pb-3 pt-2"
        style={{ boxShadow: '0 24px 48px -16px rgba(22,23,27,.32), 0 2px 6px rgba(22,23,27,.06)' }}
      >
        <div className="relative flex flex-col">
          <span
            aria-hidden
            className="absolute left-[25px] top-10 h-[66px] w-0.5"
            style={{
              backgroundImage: 'linear-gradient(#C9C9C3 50%, transparent 50%)',
              backgroundSize: '2px 6px',
            }}
          />
          <button
            type="button"
            aria-label={`Kalkış durağı: ${origin?.name ?? 'seç'}`}
            onClick={() => setPicker('origin')}
            className="flex h-[70px] items-center gap-[14px] rounded-[20px] border-0 bg-transparent pl-[18px] pr-16 text-left"
          >
            <span
              aria-hidden
              className="h-4 w-4 flex-none rounded-full border-[3px] border-sk-ink"
            />
            <span className="flex min-w-0 flex-col gap-0.5">
              <span className="eyebrow">Nereden</span>
              <span className="whitespace-nowrap text-lg font-bold" style={valueStyle(10)}>
                {origin?.name ?? 'Durak seç'}
              </span>
            </span>
          </button>
          <span aria-hidden className="ml-12 mr-[72px] h-px bg-[#ECECE8]" />
          <button
            type="button"
            aria-label={`Varış durağı: ${destination?.name ?? 'seç'}`}
            onClick={() => setPicker('destination')}
            className="flex h-[70px] items-center gap-[14px] rounded-[20px] border-0 bg-transparent pl-[18px] pr-16 text-left"
          >
            <MapPin
              aria-hidden
              size={16}
              className="flex-none text-sk-brand"
              fill="currentColor"
              stroke="#fff"
            />
            <span className="flex min-w-0 flex-col gap-0.5">
              <span className="eyebrow">Nereye</span>
              <span className="whitespace-nowrap text-lg font-bold" style={valueStyle(-10)}>
                {destination?.name ?? 'Durak seç'}
              </span>
            </span>
          </button>
          <button
            type="button"
            aria-label="Kalkış ve varışı yer değiştir"
            onClick={swap}
            className="absolute right-[14px] top-1/2 -mt-6 grid h-12 w-12 place-items-center rounded-full border border-[#E1E1DE] bg-white text-sk-ink"
            style={{ boxShadow: '0 6px 14px rgba(22,23,27,.08)' }}
          >
            <ArrowUpDown
              size={20}
              strokeWidth={2.2}
              aria-hidden
              style={{
                transform: `rotate(${rotation}deg)`,
                transition: 'transform 560ms cubic-bezier(.34,1.56,.64,1)',
              }}
            />
          </button>
        </div>

        <div
          role="group"
          aria-label="Tarih"
          className="grid grid-cols-[1fr_1fr_52px] gap-2 px-1 pt-1.5"
        >
          {days.map((day) => {
            const on = date === day.id;
            return (
              <button
                key={day.key}
                type="button"
                aria-pressed={on}
                onClick={() => setDate(day.id)}
                className={`flex h-[52px] flex-col items-start justify-center gap-px rounded-2xl border-0 px-[14px] text-left transition-colors duration-[260ms] ${
                  on ? 'bg-sk-dark text-white' : 'bg-sk-bg text-sk-ink'
                }`}
              >
                <span className="text-[15px] font-extrabold">{day.label}</span>
                <span className="text-xs opacity-80">{day.sub}</span>
              </button>
            );
          })}
          <button
            type="button"
            aria-label={
              customDate
                ? `Tarih: ${formatDayMonth(`${date}T12:00:00`)}. Takvimden değiştir`
                : 'Takvimden tarih seç'
            }
            aria-pressed={customDate}
            onClick={() => setPicker('date')}
            className={`grid h-[52px] place-items-center rounded-2xl border-0 ${
              customDate ? 'bg-sk-dark text-white' : 'bg-sk-bg text-sk-ink'
            }`}
          >
            <CalendarDays size={20} strokeWidth={2} aria-hidden />
          </button>
        </div>

        <button type="button" onClick={search} className="btn btn-brand mx-1 mt-2.5">
          Sefer ara
          <ArrowRight size={20} strokeWidth={2.4} aria-hidden />
        </button>
      </div>

      {(['origin', 'destination'] as const).map((kind) => (
        <BottomSheet
          key={kind}
          open={picker === kind}
          onClose={() => setPicker(null)}
          label={kind === 'origin' ? 'Kalkış durağı seç' : 'Varış durağı seç'}
        >
          <div className="flex max-h-[80dvh] flex-col gap-3 overflow-y-auto px-5 pb-6 pt-[26px]">
            <div className="flex items-center justify-between">
              <h2 className="m-0 text-[22px] font-extrabold">
                {kind === 'origin' ? 'Nereden' : 'Nereye'}
              </h2>
              <button
                type="button"
                aria-label="Kapat"
                onClick={() => setPicker(null)}
                className="round-btn border-0 bg-sk-bg"
              >
                <X size={18} strokeWidth={2.6} aria-hidden />
              </button>
            </div>
            <ul className="m-0 flex list-none flex-col p-0">
              {locations.map((location) => {
                const current = kind === 'origin' ? originId : destinationId;
                return (
                  <li key={location.id}>
                    <button
                      type="button"
                      aria-pressed={location.id === current}
                      onClick={() => choose(kind, location.id)}
                      className="flex min-h-[58px] w-full items-center gap-3 border-0 border-b border-[#F0F0ED] bg-transparent px-1 text-left text-base font-bold"
                    >
                      <MapPin
                        size={18}
                        aria-hidden
                        className={location.id === current ? 'text-sk-brand' : 'text-sk-ink3'}
                      />
                      <span className="flex-1">{location.name}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </BottomSheet>
      ))}

      <BottomSheet open={picker === 'date'} onClose={() => setPicker(null)} label="Tarih seç">
        <div className="flex flex-col gap-3 px-5 pb-6 pt-[26px]">
          <div className="flex items-center justify-between">
            <h2 className="m-0 text-[22px] font-extrabold">Tarih seç</h2>
            <button
              type="button"
              aria-label="Kapat"
              onClick={() => setPicker(null)}
              className="round-btn border-0 bg-sk-bg"
            >
              <X size={18} strokeWidth={2.6} aria-hidden />
            </button>
          </div>
          {picker === 'date' ? (
            <Calendar
              value={date}
              onSelect={(iso) => {
                setDate(iso);
                setPicker(null);
              }}
            />
          ) : null}
        </div>
      </BottomSheet>
    </>
  );
}
