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

const seatStateClass: Record<SeatState, string> = {
  available:
    'border-ink-300 bg-white text-ink-800 hover:-translate-y-0.5 hover:border-brand-500 hover:bg-brand-50 hover:text-brand-800',
  selected: 'border-brand-800 bg-brand-700 text-white shadow-brand ring-4 ring-brand-100',
  held: 'border-dashed border-ember-500 bg-ember-100 text-ember-800',
  purchased: 'border-ink-200 bg-ink-100 text-ink-400',
  blocked: 'border-ink-200 bg-ink-100 text-ink-400',
};

const legend: Array<{ state: SeatState; label: string }> = [
  { state: 'available', label: 'Uygun' },
  { state: 'selected', label: 'Seçtiğiniz' },
  { state: 'held', label: 'Geçici ayrılmış' },
  { state: 'purchased', label: 'Dolu' },
];

/** Occupied seats also carry a hatch pattern so status is not colour-only. */
const occupiedPattern = {
  backgroundImage:
    'repeating-linear-gradient(135deg, rgba(30,26,23,0.10) 0 3px, transparent 3px 7px)',
};

function StateGlyph({ state }: { state: SeatState }) {
  if (state === 'selected')
    return (
      <span className="absolute -right-1.5 -top-1.5 grid h-5 w-5 place-items-center rounded-full bg-white text-brand-700 shadow ring-1 ring-brand-200">
        <Check className="h-3 w-3" aria-hidden />
      </span>
    );
  if (state === 'held')
    return (
      <span className="absolute -right-1.5 -top-1.5 grid h-5 w-5 place-items-center rounded-full bg-white text-ember-700 shadow ring-1 ring-ember-200">
        <Clock3 className="h-3 w-3" aria-hidden />
      </span>
    );
  if (state === 'purchased' || state === 'blocked')
    return (
      <span className="absolute -right-1.5 -top-1.5 grid h-5 w-5 place-items-center rounded-full bg-white text-ink-400 shadow ring-1 ring-ink-200">
        <X className="h-3 w-3" aria-hidden />
      </span>
    );
  return null;
}

function SeatGlyph({ seatNo, state }: { seatNo: string; state: SeatState }) {
  return (
    <>
      <span
        className={`absolute inset-x-2 top-1.5 h-1 rounded-full ${
          state === 'selected' ? 'bg-white/50' : 'bg-current opacity-25'
        }`}
        aria-hidden
      />
      <span className="num mt-1 text-sm font-bold">{seatNo}</span>
      <StateGlyph state={state} />
    </>
  );
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
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_21rem] lg:items-start lg:gap-5">
      {/* ------------------------------------------------------------ *
       * Deck plan
       * ------------------------------------------------------------ */}
      <section className="card p-4 sm:p-6" aria-label="Otobüs yerleşim planı">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="eyebrow">Yerleşim planı</p>
            <h2 className="title-md mt-1">
              {availableCount} koltuk uygun
              <span className="ml-2 text-sm font-semibold text-ink-500">
                / {seatMap.seats.length}
              </span>
            </h2>
          </div>
          <ul className="flex flex-wrap gap-x-4 gap-y-2">
            {legend.map(({ state, label }) => (
              <li key={state} className="flex items-center gap-1.5 text-2xs font-bold text-ink-600">
                <span
                  className={`grid h-5 w-5 place-items-center rounded-md border-2 ${seatStateClass[state]}`}
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
        <div className="mx-auto mt-6 w-full max-w-[21rem]">
          <div className="rounded-[2.25rem] border-[5px] border-ink-800 bg-ink-50 p-2.5 shadow-lift sm:p-3.5">
            {/* Cockpit */}
            <div className="relative mb-3 overflow-hidden rounded-t-[1.6rem] rounded-b-lg bg-ink-200/70 px-3 pb-3 pt-4">
              <span
                className="absolute inset-x-6 top-1.5 h-2 rounded-full bg-ink-300"
                aria-hidden
              />
              <div className="flex items-end justify-between">
                <span className="flex items-center gap-2 text-2xs font-bold uppercase tracking-[0.16em] text-ink-500">
                  Ön
                </span>
                <span
                  className="grid h-9 w-9 place-items-center rounded-full border-4 border-ink-400 bg-white"
                  title="Şoför"
                  aria-hidden
                >
                  <span className="h-2 w-2 rounded-full bg-ink-400" />
                </span>
              </div>
              <span className="absolute -right-1 bottom-3 h-8 w-2 rounded-l bg-ink-400" aria-hidden />
            </div>

            {/* Seat grid */}
            <div className="space-y-2">
              {seatRows.map(({ row, items }) => (
                <div
                  key={row}
                  className="grid grid-cols-[repeat(2,minmax(0,3rem))_1.25rem_minmax(0,3rem)] justify-center gap-2"
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
                          {column === 3 ? (
                            <span className="h-full w-px bg-ink-200" />
                          ) : null}
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
                        className={`relative grid h-12 w-full place-items-center rounded-xl border-2 shadow-seat transition duration-150 disabled:cursor-not-allowed ${seatStateClass[state]}`}
                      >
                        <SeatGlyph seatNo={item.seatNo} state={state} />
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>

            <div className="mt-3 rounded-b-[1.6rem] rounded-t-lg bg-ink-200/70 py-2 text-center text-2xs font-bold uppercase tracking-[0.16em] text-ink-500">
              Arka
            </div>
          </div>
          <p className="mt-3 text-center text-2xs font-medium text-ink-500">
            Plan, aracın gerçek {seatMap.seatLayout?.layout || '2+1'} yerleşimini yansıtır.
          </p>
        </div>
      </section>

      {/* ------------------------------------------------------------ *
       * Selection summary
       * ------------------------------------------------------------ */}
      <aside className="lg:sticky lg:top-[calc(var(--app-header-h)+1rem)]">
        <div className="panel p-5">
          <div className="flex items-center justify-between gap-3">
            <p className="eyebrow-invert">Seçim özeti</p>
            {holdActive ? (
              <span className="badge bg-ember-400/20 text-ember-200 ring-1 ring-inset ring-ember-400/40">
                <Clock3 className="h-3 w-3" aria-hidden />
                Ayrıldı
              </span>
            ) : null}
          </div>

          {holdActive && selected ? (
            <>
              <div className="mt-5 flex items-end justify-between gap-3">
                <div>
                  <p className="text-2xs font-bold uppercase tracking-wide text-ink-400">Koltuk</p>
                  <p className="num font-display text-5xl font-extrabold leading-none">
                    {selectedSeat}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-2xs font-bold uppercase tracking-wide text-ink-400">Tutar</p>
                  <p className="num font-display text-2xl font-extrabold">
                    {formatMinorPrice(selected.priceMinor)}
                  </p>
                </div>
              </div>

              <div className="mt-5 rounded-2xl bg-white/10 p-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <Clock3 className="h-4 w-4 text-ember-300" aria-hidden />
                    Ayırma süresi
                  </span>
                  <strong className="num" aria-live="polite">
                    {countdownLabel}
                  </strong>
                </div>
                <span className="meter mt-2 bg-white/15">
                  <span
                    className="meter-fill bg-ember-400 transition-[width] duration-1000 ease-linear"
                    style={{
                      width: `${Math.min(100, Math.round((countdown / Math.max(1, holdInfo?.ttlSeconds || 300)) * 100))}%`,
                    }}
                  />
                </span>
                <p className="mt-2 text-2xs leading-4 text-ink-400">
                  Süre dolduğunda koltuk otomatik olarak serbest bırakılır.
                </p>
              </div>

              <button
                type="button"
                onClick={() => router.push(continueHref)}
                className="btn btn-primary mt-5 hidden w-full lg:inline-flex"
              >
                Devam et
                <ArrowRight className="h-4 w-4" aria-hidden />
              </button>
              <button
                type="button"
                onClick={() => void release()}
                className="mt-3 w-full py-2 text-sm font-bold text-ink-300 underline-offset-4 transition hover:text-white hover:underline"
              >
                Seçimi bırak
              </button>
            </>
          ) : (
            <div className="py-8 text-center">
              <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-white/10">
                <Armchair className="h-7 w-7 text-brand-300" aria-hidden />
              </span>
              <p className="mt-4 font-display font-bold">Bir koltuk seçin</p>
              <p className="mt-2 text-sm leading-6 text-ink-400">
                Plandaki uygun koltuklardan birine dokunun; yeriniz ödeme adımına kadar size
                ayrılır.
              </p>
            </div>
          )}

          <p className="mt-5 flex items-start gap-2 border-t border-white/10 pt-4 text-2xs leading-5 text-ink-400">
            <LockKeyhole className="mt-px h-3.5 w-3.5 shrink-0 text-ink-300" aria-hidden />
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

      {/* Mobile continue bar */}
      {holdActive && selected ? (
        <div className="action-bar flex items-center gap-3 lg:hidden">
          <div className="min-w-0">
            <p className="text-2xs font-bold uppercase tracking-wide text-ink-500">
              Koltuk {selectedSeat} · {countdownLabel}
            </p>
            <p className="num font-display text-xl font-extrabold leading-tight">
              {formatMinorPrice(selected.priceMinor)}
            </p>
          </div>
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
