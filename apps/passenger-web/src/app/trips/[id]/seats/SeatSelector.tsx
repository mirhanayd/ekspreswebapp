'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, BusFront, Clock3, Gauge, LoaderCircle } from 'lucide-react';

type Seat = { id: string; seatNo: string; seatType: string; priceMinor: number; status: string };
type LayoutItem = { type: string; seatNo?: string; row: number; column: number };
type SeatMapData = {
  tripId: string;
  bus: { plateNumber: string; model: string };
  seatLayout: { layout: string; rows: number; columns: number; items: LayoutItem[] };
  seats: Seat[];
};

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
  const statusFor = (seatNo: string) =>
    selectedSeat === seatNo
      ? 'selected'
      : seatMap.seats.find((seat) => seat.seatNo === seatNo)?.status || 'blocked';
  const classFor = (status: string) =>
    ({
      selected: 'border-red-800 bg-red-700 text-white shadow-lg ring-4 ring-red-100',
      available: 'border-stone-300 bg-white text-slate-800 hover:border-red-500 hover:bg-red-50',
      held: 'border-amber-300 bg-amber-100 text-amber-800',
      purchased: 'border-slate-300 bg-slate-200 text-slate-400',
      blocked: 'border-slate-300 bg-slate-200 text-slate-400',
    })[status] || 'border-slate-300 bg-slate-100 text-slate-400';
  const rows = Array.from({ length: seatMap.seatLayout?.rows || 14 }, (_, index) => ({
    row: index + 1,
    items: (seatMap.seatLayout?.items || []).filter((item) => item.row === index + 1),
  }));
  const selected = seatMap.seats.find((seat) => seat.seatNo === selectedSeat);
  return (
    <div className="grid gap-7 lg:grid-cols-[minmax(320px,1fr)_320px]">
      <div>
        <div className="mb-5 flex flex-wrap gap-3 text-xs font-semibold text-slate-600">
          {[
            ['Uygun', 'border-stone-300 bg-white'],
            ['Seçili', 'border-red-800 bg-red-700'],
            ['Ayrılmış', 'border-amber-300 bg-amber-100'],
            ['Dolu', 'border-slate-300 bg-slate-200'],
          ].map(([label, color]) => (
            <span key={label} className="flex items-center gap-2">
              <i className={`h-5 w-5 rounded-md border-2 ${color}`} />
              {label}
            </span>
          ))}
        </div>
        <div className="mx-auto max-w-sm rounded-[2.5rem] border-4 border-slate-800 bg-stone-100 p-4 shadow-inner sm:p-6">
          <div className="mb-5 flex h-14 items-center justify-between rounded-t-[1.5rem] border-b-2 border-slate-300 bg-slate-200 px-4">
            <span className="text-xs font-black uppercase tracking-widest text-slate-500">Ön</span>
            <Gauge className="h-8 w-8 text-slate-700" />
          </div>
          <div className="space-y-2">
            {rows.map(({ row, items }) => (
              <div key={row} className="grid grid-cols-[48px_48px_24px_48px] justify-center gap-2">
                {[1, 2, 3, 4].map((column) => {
                  const item = items.find((entry) => entry.column === column);
                  if (!item || item.type === 'aisle')
                    return <span key={column} className={column === 3 ? 'w-6' : 'w-12'} />;
                  if (item.type === 'driver')
                    return (
                      <span
                        key={column}
                        className="grid h-12 w-12 place-items-center rounded-xl bg-slate-300"
                      >
                        <BusFront className="h-5 w-5" />
                      </span>
                    );
                  if (item.type === 'seat' && item.seatNo) {
                    const status = statusFor(item.seatNo);
                    const data = seatMap.seats.find((seat) => seat.seatNo === item.seatNo);
                    return (
                      <button
                        key={column}
                        type="button"
                        aria-label={`Koltuk ${item.seatNo}, ${status}`}
                        disabled={!['available', 'selected'].includes(status)}
                        onClick={() =>
                          status === 'selected' ? void release() : data && void choose(data)
                        }
                        className={`grid h-12 w-12 place-items-center rounded-xl border-2 text-sm font-black transition ${classFor(status)}`}
                      >
                        {item.seatNo}
                      </button>
                    );
                  }
                  return <span key={column} />;
                })}
              </div>
            ))}
          </div>
          <div className="mt-5 rounded-b-[1.5rem] border-t-2 border-slate-300 pt-3 text-center text-[10px] font-black uppercase tracking-widest text-slate-400">
            Arka
          </div>
        </div>
      </div>
      <aside className="lg:sticky lg:top-24 lg:self-start">
        <div className="rounded-2xl bg-slate-950 p-5 text-white">
          <p className="eyebrow !text-red-400">Seçim özeti</p>
          {holdInfo && selected ? (
            <>
              <div className="mt-5 flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-400">Koltuk</p>
                  <p className="text-4xl font-black">{selectedSeat}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-slate-400">Tutar</p>
                  <p className="text-2xl font-black">
                    {(selected.priceMinor / 100).toLocaleString('tr-TR')} ₺
                  </p>
                </div>
              </div>
              <div className="mt-5 flex items-center justify-between rounded-xl bg-white/10 p-3">
                <span className="flex items-center gap-2 text-sm">
                  <Clock3 className="h-4 w-4 text-red-400" />
                  Ayırma süresi
                </span>
                <strong className="tabular-nums">
                  {Math.floor(countdown / 60)}:{String(countdown % 60).padStart(2, '0')}
                </strong>
              </div>
              <button
                type="button"
                onClick={() =>
                  router.push(
                    `/trips/${tripId}/checkout?seatNo=${encodeURIComponent(holdInfo.seatNo)}&holdId=${encodeURIComponent(holdInfo.holdId)}`,
                  )
                }
                className="primary-action mt-5 w-full"
              >
                Devam et <ArrowRight className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={() => void release()}
                className="mt-3 w-full py-2 text-sm font-bold text-slate-300 hover:text-white"
              >
                Seçimi bırak
              </button>
            </>
          ) : (
            <div className="py-10 text-center">
              <BusFront className="mx-auto h-12 w-12 text-slate-600" />
              <p className="mt-4 font-bold">Bir koltuk seçin</p>
              <p className="mt-2 text-sm leading-6 text-slate-400">
                Beyaz koltuklardan birine dokunarak 10 dakikalık ayırma süresini başlatın.
              </p>
            </div>
          )}
        </div>
        {error && (
          <p
            role="alert"
            className="mt-3 rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-800"
          >
            {error}
          </p>
        )}
        {loading && (
          <p className="mt-3 flex items-center justify-center gap-2 text-sm text-slate-500">
            <LoaderCircle className="h-4 w-4 animate-spin" />
            Koltuk ayrılıyor…
          </p>
        )}
      </aside>
    </div>
  );
}
