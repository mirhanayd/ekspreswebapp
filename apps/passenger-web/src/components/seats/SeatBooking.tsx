'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowRight, TriangleAlert } from 'lucide-react';
import { useNav } from '@/components/nav/NavProvider';
import { PaymentSheet, type Passenger } from './PaymentSheet';
import { SeatMap, placeSeats, type SeatLayoutItem, type SeatStatus } from './SeatMap';
import { formatMinorPrice } from '@/lib/format';

type Seat = { id: string; seatNo: string; seatType: string; priceMinor: number; status: string };
export type SeatMapData = {
  tripId: string;
  bus: { plateNumber: string; model: string };
  seatLayout: { layout: string; items: SeatLayoutItem[] };
  seats: Seat[];
};

type Hold = { holdId: string; seatNo: string; expiresAt: string; ttlSeconds: number };

/**
 * Seat selection and payment for one trip. Holds, release, expiry and the order
 * and payment calls are the same server contracts as before; this component
 * only draws them: the plan, the selection bar and the payment sheet.
 */
export function SeatBooking({
  tripId,
  initialData,
  summary,
  stopName,
  passenger,
}: {
  tripId: string;
  initialData: SeatMapData;
  summary: { departure: string; route: string; meta: string };
  stopName: string;
  passenger: Passenger;
}) {
  const nav = useNav();
  const [seatMap, setSeatMap] = useState(initialData);
  const [selectedSeat, setSelectedSeat] = useState<string | null>(null);
  const [popSeat, setPopSeat] = useState<string | null>(null);
  const [hold, setHold] = useState<Hold | null>(null);
  const [countdown, setCountdown] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [payOpen, setPayOpen] = useState(false);
  const popTimer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(popTimer.current), []);

  const refresh = useCallback(async () => {
    try {
      const response = await fetch(`/api/seats/trip/${tripId}`);
      if (response.ok) setSeatMap(await response.json());
    } catch {
      // Retain the last authoritative seat snapshot when refresh is unavailable.
    }
  }, [tripId]);

  useEffect(() => {
    if (!hold) {
      setCountdown(0);
      return;
    }
    const expiresAt = new Date(hold.expiresAt).getTime();
    const tick = () => {
      const remaining = Math.max(0, Math.floor((expiresAt - Date.now()) / 1000));
      setCountdown(remaining);
      if (!remaining) {
        setHold(null);
        setSelectedSeat(null);
        setPayOpen(false);
        setError('Koltuk ayırma süresi doldu. Lütfen yeniden seç.');
        void refresh();
      }
    };
    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, [hold, refresh]);

  const release = useCallback(async () => {
    if (!hold) return;
    try {
      await fetch(`/api/seats/hold/${hold.holdId}`, { method: 'DELETE' });
    } catch {
      // Releasing is best effort; the server expires abandoned holds safely.
    }
    setHold(null);
    setSelectedSeat(null);
    await refresh();
  }, [hold, refresh]);

  async function pick(seatNo: string) {
    if (loading) return;
    if (selectedSeat === seatNo) {
      await release();
      return;
    }
    const seat = seatMap.seats.find((item) => item.seatNo === seatNo);
    if (!seat || seat.status !== 'available') return;
    if (hold) await release();
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/seats/hold', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tripId, seatNo }),
      });
      if (response.status === 401) {
        nav.push(`/login?returnTo=${encodeURIComponent(`/trips/${tripId}/seats`)}`);
        return;
      }
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message || 'Koltuk ayrılamadı.');
      setHold(payload);
      setSelectedSeat(seatNo);
      setPopSeat(seatNo);
      window.clearTimeout(popTimer.current);
      popTimer.current = window.setTimeout(() => setPopSeat(null), 240);
      await refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Koltuk ayrılamadı.');
    } finally {
      setLoading(false);
    }
  }

  async function pay(person: Passenger) {
    if (!hold || !selectedSeat) throw new Error('Önce bir koltuk seç.');
    const orderResponse = await fetch('/api/checkout/order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tripId,
        seatNo: selectedSeat,
        holdId: hold.holdId,
        passengerFirstName: person.firstName,
        passengerLastName: person.lastName,
        passengerPhone: person.phone || undefined,
        passengerEmail: person.email || undefined,
        idempotencyKey: crypto.randomUUID(),
      }),
    });
    if (orderResponse.status === 401) {
      nav.push(`/login?returnTo=${encodeURIComponent(`/trips/${tripId}/seats`)}`);
      throw new Error('Oturumun sona erdi. Lütfen yeniden giriş yap.');
    }
    const order = await orderResponse.json();
    if (!orderResponse.ok) throw new Error(order.message || 'Sipariş oluşturulamadı.');
    const paymentResponse = await fetch(`/api/checkout/order/${order.id}/pay`, { method: 'POST' });
    const payment = await paymentResponse.json();
    if (!paymentResponse.ok) throw new Error(payment.message || 'Ödeme tamamlanamadı.');
    return payment.ticket.id as string;
  }

  const layout = placeSeats(seatMap.seatLayout?.items ?? []);
  const kinds = new Map(layout.seats.map((seat) => [seat.seatNo, seat.kind]));
  const selected = seatMap.seats.find((seat) => seat.seatNo === selectedSeat);
  const price =
    selected?.priceMinor ??
    seatMap.seats.find((seat) => seat.status === 'available')?.priceMinor ??
    0;
  const free = seatMap.seats.filter((seat) => seat.status === 'available').length;
  const countdownLabel = `${Math.floor(countdown / 60)}:${String(countdown % 60).padStart(2, '0')}`;
  const statusOf = (seatNo: string): SeatStatus =>
    (seatMap.seats.find((seat) => seat.seatNo === seatNo)?.status ?? 'blocked') as SeatStatus;

  return (
    <>
      <div className="flex items-center gap-4 px-5 pb-2 pt-1 text-[13px] font-semibold text-[#3F434B]">
        <span className="inline-flex items-center gap-1.5">
          <span
            aria-hidden
            className="h-3.5 w-4 rounded border-[1.5px] border-[#C9C9C3] bg-white"
          />
          Boş
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden className="h-3.5 w-4 rounded bg-[#DCDCD6]" />
          Dolu
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden className="h-3.5 w-4 rounded bg-sk-brand" />
          Seçimin
        </span>
        <span className="ml-auto text-sk-ink2">{free} boş</span>
      </div>

      <div className="px-0 pb-[130px] pt-1" aria-label="Otobüs yerleşim planı" role="group">
        <SeatMap
          items={seatMap.seatLayout?.items ?? []}
          statusOf={statusOf}
          selectedSeat={selectedSeat}
          popSeat={popSeat}
          onPick={(seatNo) => void pick(seatNo)}
        />
      </div>

      <div
        className="fixed-col bottom-0 z-[5] box-border flex flex-col gap-2 border-t border-sk-line bg-white px-4 pt-3.5"
        style={{ paddingBottom: 'calc(22px + var(--safe-bottom))' }}
      >
        {error ? (
          <p
            role="alert"
            className="m-0 flex items-start gap-2 text-[13px] font-semibold text-sk-brandInk"
          >
            <TriangleAlert size={16} aria-hidden className="mt-px flex-none" />
            {error}
          </p>
        ) : null}
        <div className="flex items-center gap-[14px]">
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="truncate text-[13px] text-sk-ink2" aria-live="polite">
              {loading
                ? 'Koltuk ayrılıyor…'
                : selectedSeat
                  ? `Koltuk ${selectedSeat} · ${kinds.get(selectedSeat) ?? ''}`
                  : 'Haritadan bir koltuk seç'}
            </span>
            <span className="flex items-baseline gap-2">
              <span className="text-2xl font-extrabold">{formatMinorPrice(price)}</span>
              {hold ? (
                <span className="text-xs font-bold text-sk-ink2">
                  Ayırma süresi <span className="num-md">{countdownLabel}</span>
                </span>
              ) : null}
            </span>
          </div>
          <button
            type="button"
            disabled={!hold || !selectedSeat}
            onClick={() => setPayOpen(true)}
            className={`btn h-14 text-base text-white ${hold && selectedSeat ? 'bg-sk-brand' : 'bg-[#B9BAB5]'}`}
          >
            Devam et
            <ArrowRight size={18} strokeWidth={2.4} aria-hidden />
          </button>
        </div>
      </div>

      <PaymentSheet
        open={payOpen}
        onClose={() => setPayOpen(false)}
        summary={{
          ...summary,
          meta: `${summary.meta} · Koltuk ${selectedSeat ?? '–'}`,
        }}
        seatNo={selectedSeat ?? ''}
        priceLabel={formatMinorPrice(price).replace(/^(.*) ₺$/, '₺$1')}
        stopName={stopName}
        initialPassenger={passenger}
        onPay={pay}
        onDone={(ticketId) => nav.push(`/tickets/${ticketId}?yeni=1`)}
      />
    </>
  );
}
