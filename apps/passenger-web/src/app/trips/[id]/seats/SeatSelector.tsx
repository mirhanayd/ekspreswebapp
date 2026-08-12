'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowRight,
  Armchair,
  Check,
  Clock3,
  LoaderCircle,
  LockKeyhole,
  TriangleAlert,
  X,
} from 'lucide-react';
import { formatMinorPrice } from '@/lib/format';

type Seat = { id: string; seatNo: string; seatType: string; priceMinor: number; status: string };
type LayoutItem = { type: string; seatNo?: string; row: number; column: number };
type SeatMapData = {
  tripId: string;
  bus: { plateNumber: string; model: string };
  seatLayout: { layout: string; rows: number; columns: number; items: LayoutItem[] };
  seats: Seat[];
};

type SeatState = 'available' | 'selected' | 'held' | 'purchased' | 'blocked';

/**
 * Seat states use the reference vocabulary: white surfaces on the cream canvas,
 * lime for the passenger's own selection, amber for a temporary hold, and a
 * muted flat tone for sold seats.
 */
const seatStateClass: Record<SeatState, string> = {
  available:
    'bg-white text-ink-800 shadow-card ring-1 ring-inset ring-ink-900/10 hover:-translate-y-0.5 hover:bg-lime-100',
  selected: 'bg-lime-400 text-ink-900 shadow-float',
  held: 'bg-amber-200 text-ink-700',
  purchased: 'bg-ink-900/[0.08] text-ink-400',
  blocked: 'bg-ink-900/[0.08] text-ink-400',
};

const legend: Array<{ state: SeatState; label: string }> = [
  { state: 'available', label: 'Uygun' },
  { state: 'selected', label: 'Seçtiğiniz' },
  { state: 'held', label: 'Geçici ayrılmış' },
  { state: 'purchased', label: 'Dolu' },
];

/** Occupied seats also carry a hatch, so status is never colour-only. */
const occupiedPattern = {
  backgroundImage:
    'repeating-linear-gradient(135deg, rgba(5,26,9,0.12) 0 3px, transparent 3px 7px)',
};

function StateGlyph({ state }: { state: SeatState }) {
  if (state === 'selected')
    return (
      <span className="absolute -right-1 -top-1 grid h-5 w-5 place-items-center rounded-full bg-ink-900 text-white">
        <Check className="h-3 w-3" aria-hidden />
      </span>
    );
  if (state === 'held')
    return (
      <span className="absolute -right-1 -top-1 grid h-5 w-5 place-items-center rounded-full bg-amber-400 text-ink-900">
        <Clock3 className="h-3 w-3" aria-hidden />
      </span>
    );
  if (state === 'purchased' || state === 'blocked')
    return (
      <span className="absolute -right-1 -top-1 grid h-5 w-5 place-items-center rounded-full bg-white text-ink-400 shadow-card">
        <X className="h-3 w-3" aria-hidden />
      </span>
    );
  return null;
}

export default function SeatSelector({
  tripId,
  initialData,
}: {
  tripId: string;
  initialData: SeatMapData;
}) {
  const router = useRouter();
  const [seatMap, setSeatMap] = useState(initialData);
  const [selectedSeat, setSelectedSeat] = useState<string | null>(null);
  const [holdInfo, setHoldInfo] = useState<{
    holdId: string;
    seatNo: string;
    expiresAt: string;
    ttlSeconds: number;
  } | null>(null);
  const [countdown, setCountdown] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const response = await fetch(`/api/passenger/seats/trip/${tripId}`);
      if (response.ok) setSeatMap(await response.json());
    } catch {
      // Retain the last authoritative seat snapshot when refresh is unavailable.
    }
  }, [tripId]);

  useEffect(() => {
    if (!holdInfo) {
      setCountdown(0);
      return;
    }
    const expiresAt = new Date(holdInfo.expiresAt).getTime();
    const timer = window.setInterval(() => {
      const remaining = Math.max(0, Math.floor((expiresAt - Date.now()) / 1000));
      setCountdown(remaining);
      if (!remaining) {
        setHoldInfo(null);
        setSelectedSeat(null);
        void refresh();
        window.clearInterval(timer);
      }
    }, 1000);
    return () => window.clearInterval(timer);
  }, [holdInfo, refresh]);

  const release = useCallback(async () => {
    if (!holdInfo) return;
    try {
      await fetch(`/api/passenger/seats/hold/${holdInfo.holdId}`, { method: 'DELETE' });
    } catch {
      // Releasing is best effort; the server expires abandoned holds safely.
    }
    setHoldInfo(null);
    setSelectedSeat(null);
    await refresh();
  }, [holdInfo, refresh]);

  async function choose(seat: Seat) {
    if (seat.status !== 'available' || loading) return;
    if (holdInfo) await release();
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/passenger/seats/hold', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tripId, seatNo: seat.seatNo }),
      });
      if (response.status === 401) {
        router.push(`/login?returnTo=${encodeURIComponent(`/trips/${tripId}/seats`)}`);
        return;
      }
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message || 'Koltuk ayrılamadı.');
      setHoldInfo(payload);
      setSelectedSeat(seat.seatNo);
      await refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Koltuk ayrılamadı.');
    } finally {
      setLoading(false);
    }
  }

  const statusFor = (seatNo: string): SeatState =>
    (selectedSeat === seatNo
      ? 'selected'
      : seatMap.seats.find((seat) => seat.seatNo === seatNo)?.status || 'blocked') as SeatState;

  const seatRows = useMemo(() => {
    const items = seatMap.seatLayout?.items || [];
    const rowNumbers = items
      .filter((item) => item.type === 'seat')
      .map((item) => item.row)
      .filter((row, index, all) => all.indexOf(row) === index);
    return rowNumbers
      .sort((a, b) => a - b)
      .map((row) => ({ row, items: items.filter((item) => item.row === row) }));
  }, [seatMap.seatLayout]);

  const availableCount = seatMap.seats.filter((seat) => seat.status === 'available').length;
  const selected = seatMap.seats.find((seat) => seat.seatNo === selectedSeat);
  const holdActive = Boolean(holdInfo && selected);
  const countdownLabel = `${Math.floor(countdown / 60)}:${String(countdown % 60).padStart(2, '0')}`;
  const continueHref = holdInfo
    ? `/trips/${tripId}/checkout?seatNo=${encodeURIComponent(holdInfo.seatNo)}&holdId=${encodeURIComponent(holdInfo.holdId)}`
    : '';

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start lg:gap-6">
      {/* Deck plan ---------------------------------------------------- */}
      <section className="card min-w-0 p-4 sm:p-5" aria-label="Otobüs yerleşim planı">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="title-md">
            {availableCount} koltuk uygun
            <span className="ml-2 text-sm font-medium text-ink-400">/ {seatMap.seats.length}</span>
          </h2>
          <ul className="flex flex-wrap gap-x-3.5 gap-y-2">
            {legend.map(({ state, label }) => (
              <li
                key={state}
                className="flex items-center gap-1.5 text-[0.6875rem] font-semibold text-ink-600"
              >
                <span
                  className={`grid h-5 w-5 place-items-center rounded-[0.5rem] ${seatStateClass[state]}`}
                  style={state === 'purchased' ? occupiedPattern : undefined}
                  aria-hidden
                >
                  {state === 'selected' ? <Check className="h-3 w-3" /> : null}
                  {state === 'held' ? <Clock3 className="h-3 w-3" /> : null}
                  {state === 'purchased' ? <X className="h-3 w-3" /> : null}
                </span>
                {label}
              </li>
            ))}
          </ul>
        </div>

        {/* Bus shell */}
        <div className="mx-auto mt-5 w-full max-w-[20rem]">
          <div className="rounded-[2rem] bg-cream-200 p-3">
            {/* Cockpit */}
            <div className="relative mb-3 overflow-hidden rounded-t-[1.5rem] rounded-b-[0.75rem] bg-cream-300 px-3 pb-3 pt-4">
              <span
                className="absolute inset-x-8 top-2 h-1.5 rounded-full bg-ink-900/10"
                aria-hidden
              />
              <div className="flex items-end justify-between">
                <span className="text-[0.6875rem] font-bold uppercase tracking-[0.16em] text-ink-500">
                  Ön
                </span>
                <span
                  className="grid h-9 w-9 place-items-center rounded-full border-[3px] border-ink-300 bg-white"
                  title="Şoför"
                  aria-hidden
                >
                  <span className="h-2 w-2 rounded-full bg-ink-300" />
                </span>
              </div>
            </div>

            {/* Seat grid */}
            <div className="space-y-2">
              {seatRows.map(({ row, items }) => (
                <div
                  key={row}
                  className="grid grid-cols-[repeat(2,minmax(0,2.875rem))_1.125rem_minmax(0,2.875rem)] justify-center gap-2"
                >
                  {[1, 2, 3, 4].map((column) => {
                    const item = items.find((entry) => entry.column === column);
                    if (!item || item.type !== 'seat' || !item.seatNo) {
                      return (
                        <span
                          key={column}
                          className={column === 3 ? 'flex justify-center' : ''}
                          aria-hidden
                        >
                          {column === 3 ? <span className="h-full w-px bg-ink-900/10" /> : null}
                        </span>
                      );
                    }
                    const state = statusFor(item.seatNo);
                    const data = seatMap.seats.find((seat) => seat.seatNo === item.seatNo);
                    const interactive = state === 'available' || state === 'selected';
                    return (
                      <button
                        key={column}
                        type="button"
                        aria-label={`Koltuk ${item.seatNo}, ${state}`}
                        aria-pressed={state === 'selected'}
                        disabled={!interactive}
                        onClick={() =>
                          state === 'selected' ? void release() : data && void choose(data)
                        }
                        style={
                          state === 'purchased' || state === 'blocked' ? occupiedPattern : undefined
                        }
                        className={`relative grid h-11 w-full place-items-center rounded-[0.875rem] font-display text-[0.8125rem] font-bold transition duration-150 disabled:cursor-not-allowed ${seatStateClass[state]}`}
                      >
                        <span className="num">{item.seatNo}</span>
                        <StateGlyph state={state} />
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>

            <div className="mt-3 rounded-b-[1.5rem] rounded-t-[0.75rem] bg-cream-300 py-2.5 text-center text-[0.6875rem] font-bold uppercase tracking-[0.16em] text-ink-500">
              Arka
            </div>
          </div>
          <p className="caption mt-3 text-center">
            Plan, aracın gerçek {seatMap.seatLayout?.layout || '2+1'} yerleşimini yansıtır.
          </p>
        </div>
      </section>

      {/* Selection summary -------------------------------------------- */}
      <aside className="min-w-0 lg:sticky lg:top-[calc(var(--app-header-h)+1rem)]">
        <div className="panel-dark p-5">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.2em] text-white/50">
              Seçim özeti
            </p>
            {holdActive ? (
              <span className="badge badge-amber">
                <Clock3 className="h-3 w-3" aria-hidden />
                Ayrıldı
              </span>
            ) : null}
          </div>

          {holdActive && selected ? (
            <>
              <div className="mt-5 flex items-end justify-between gap-3">
                <div>
                  <p className="text-[0.6875rem] font-semibold uppercase tracking-wide text-white/50">
                    Koltuk
                  </p>
                  <p className="num font-display text-[3rem] font-bold leading-none text-white">
                    {selectedSeat}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[0.6875rem] font-semibold uppercase tracking-wide text-white/50">
                    Tutar
                  </p>
                  <p className="num font-display text-xl font-bold text-white">
                    {formatMinorPrice(selected.priceMinor)}
                  </p>
                </div>
              </div>

              <div className="mt-5 rounded-[1.25rem] bg-white/10 p-4">
                <div className="flex items-center justify-between text-sm text-white">
                  <span className="flex items-center gap-2">
                    <Clock3 className="h-4 w-4 text-amber-400" aria-hidden />
                    Ayırma süresi
                  </span>
                  <strong className="num" aria-live="polite">
                    {countdownLabel}
                  </strong>
                </div>
                <span className="meter mt-2.5 bg-white/15">
                  <span
                    className="meter-fill bg-amber-400 transition-[width] duration-1000 ease-linear"
                    style={{
                      width: `${Math.min(100, Math.round((countdown / Math.max(1, holdInfo?.ttlSeconds || 300)) * 100))}%`,
                    }}
                  />
                </span>
                <p className="mt-2.5 text-[0.6875rem] leading-4 text-white/50">
                  Süre dolduğunda koltuk otomatik olarak serbest bırakılır.
                </p>
              </div>

              <button
                type="button"
                onClick={() => router.push(continueHref)}
                className="btn btn-lime mt-5 hidden w-full lg:inline-flex"
              >
                Devam et
                <ArrowRight className="h-4 w-4" aria-hidden />
              </button>
              <button
                type="button"
                onClick={() => void release()}
                className="mt-3 w-full py-2 text-sm font-semibold text-white/60 underline-offset-4 transition hover:text-white hover:underline"
              >
                Seçimi bırak
              </button>
            </>
          ) : (
            <div className="py-8 text-center">
              <span className="mx-auto grid h-14 w-14 place-items-center rounded-[1.125rem] bg-white/10">
                <Armchair className="h-7 w-7 text-lime-400" aria-hidden />
              </span>
              <p className="mt-4 font-display font-bold text-white">Bir koltuk seçin</p>
              <p className="mt-2 text-sm leading-6 text-white/55">
                Plandaki uygun koltuklardan birine dokunun; yeriniz ödeme adımına kadar size
                ayrılır.
              </p>
            </div>
          )}

          <p className="mt-5 flex items-start gap-2 border-t border-white/10 pt-4 text-[0.6875rem] leading-5 text-white/50">
            <LockKeyhole className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden />
            Koltuk ayırma işlemi sunucuda doğrulanır; aynı koltuk başka bir yolcuya satılamaz.
          </p>
        </div>

        {error ? (
          <p role="alert" className="alert-error mt-3">
            <TriangleAlert className="mr-1.5 inline h-4 w-4 align-text-bottom" aria-hidden />
            {error}
          </p>
        ) : null}
        {loading ? (
          <p className="mt-3 flex items-center justify-center gap-2 text-sm font-semibold text-ink-500">
            <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden />
            Koltuk ayrılıyor…
          </p>
        ) : null}
      </aside>

      {/* Mobile continue bar ------------------------------------------ */}
      {holdActive && selected ? (
        <div className="action-bar flex items-center gap-3 lg:hidden">
          <p className="min-w-0 pl-2">
            <span className="block text-[0.6875rem] font-semibold text-ink-500">
              Koltuk {selectedSeat} · {countdownLabel}
            </span>
            <span className="num block font-display text-xl font-bold leading-tight text-ink-900">
              {formatMinorPrice(selected.priceMinor)}
            </span>
          </p>
          <button
            type="button"
            onClick={() => router.push(continueHref)}
            className="btn btn-primary ml-auto flex-1"
          >
            Devam et
            <ArrowRight className="h-4 w-4" aria-hidden />
          </button>
        </div>
      ) : null}
    </div>
  );
}
