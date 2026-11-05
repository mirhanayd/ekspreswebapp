'use client';

import { useEffect, useRef, useState } from 'react';
import { Bell, CreditCard, TriangleAlert, X } from 'lucide-react';
import { BottomSheet } from '@/components/BottomSheet';
import { useNotifications } from '@/components/notifications/NotificationProvider';
import { initials } from '@/lib/session-format';

export type Passenger = { firstName: string; lastName: string; phone: string; email: string };

type Phase = 'form' | 'paying' | 'done';

/**
 * Slides up from the bottom: trip summary, passenger, the "İniş bildirimleri"
 * switch and the pay button. On success the tick draws itself and the app moves
 * on to the ticket.
 */
export function PaymentSheet({
  open,
  onClose,
  summary,
  seatNo,
  priceLabel,
  stopName,
  initialPassenger,
  onPay,
  onDone,
}: {
  open: boolean;
  onClose: () => void;
  summary: { departure: string; route: string; meta: string };
  seatNo: string;
  priceLabel: string;
  stopName: string;
  initialPassenger: Passenger;
  /** Creates the order and charges it; resolves with the new ticket id. */
  onPay: (passenger: Passenger) => Promise<string>;
  onDone: (ticketId: string) => void;
}) {
  const { notifyAny, setNotify } = useNotifications();
  const [passenger, setPassenger] = useState(initialPassenger);
  const [editing, setEditing] = useState(false);
  const [phase, setPhase] = useState<Phase>('form');
  const [error, setError] = useState<string | null>(null);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(timer.current), []);
  useEffect(() => {
    if (open) setError(null);
  }, [open]);

  const fullName = `${passenger.firstName} ${passenger.lastName}`.trim();
  const busy = phase !== 'form';

  async function pay() {
    if (!passenger.firstName.trim() || !passenger.lastName.trim()) {
      setEditing(true);
      setError('Ad ve soyad zorunludur.');
      return;
    }
    setError(null);
    setPhase('paying');
    try {
      const ticketId = await onPay(passenger);
      setPhase('done');
      timer.current = window.setTimeout(() => onDone(ticketId), 1500);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Ödeme tamamlanamadı.');
      setPhase('form');
    }
  }

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      label="Yolcu ve ödeme"
      height={566}
      dismissible={!busy}
    >
      <div
        aria-hidden={phase === 'done'}
        className="absolute inset-x-5 bottom-[26px] top-6 flex flex-col gap-3"
        style={{
          opacity: phase === 'done' ? 0 : 1,
          transform: `scale(${phase === 'done' ? 0.96 : 1})`,
          transition: 'opacity 260ms ease, transform 420ms cubic-bezier(.22,1,.36,1)',
          pointerEvents: phase === 'done' ? 'none' : 'auto',
        }}
      >
        <div className="flex items-center justify-between">
          <h2 className="m-0 text-[22px] font-extrabold">Ödeme</h2>
          <button
            type="button"
            aria-label="Kapat"
            onClick={onClose}
            disabled={busy}
            className="round-btn border-0 bg-sk-bg disabled:opacity-40"
          >
            <X size={18} strokeWidth={2.6} aria-hidden />
          </button>
        </div>

        <div className="flex items-center gap-[14px] rounded-[20px] bg-sk-dark px-4 py-[14px] text-white">
          <span className="num-md text-[30px] leading-none [font-stretch:120%]">
            {summary.departure}
          </span>
          <span className="flex min-w-0 flex-col gap-0.5">
            <span className="text-[15px] font-extrabold">{summary.route}</span>
            <span className="text-[13px] text-sk-mute">{summary.meta}</span>
          </span>
        </div>

        <div className="border-b border-[#F0F0ED] px-1 pb-2">
          <div className="flex min-h-[50px] items-center gap-3">
            <span className="grid h-10 w-10 flex-none place-items-center rounded-full bg-sk-brand text-sm font-extrabold text-white">
              {initials(passenger.firstName, passenger.lastName) || '–'}
            </span>
            <span className="flex flex-1 flex-col gap-0.5">
              <span className="text-[15px] font-extrabold">{fullName || 'Yolcu bilgisi'}</span>
              <span className="text-[13px] text-sk-ink2">
                {passenger.phone || passenger.email || 'Telefon eklenmedi'}
              </span>
            </span>
            <button
              type="button"
              aria-expanded={editing}
              onClick={() => setEditing((current) => !current)}
              className="h-11 border-0 bg-transparent px-1.5 text-sm font-extrabold text-sk-brandInk"
            >
              {editing ? 'Bitti' : 'Düzenle'}
            </button>
          </div>
          {editing ? (
            <div className="grid grid-cols-2 gap-2 pb-1 pt-1">
              <label className="block">
                <span className="field-label">Ad</span>
                <input
                  className="field !h-11"
                  value={passenger.firstName}
                  autoComplete="given-name"
                  onChange={(event) =>
                    setPassenger({ ...passenger, firstName: event.target.value })
                  }
                />
              </label>
              <label className="block">
                <span className="field-label">Soyad</span>
                <input
                  className="field !h-11"
                  value={passenger.lastName}
                  autoComplete="family-name"
                  onChange={(event) => setPassenger({ ...passenger, lastName: event.target.value })}
                />
              </label>
              <label className="col-span-2 block">
                <span className="field-label">Telefon</span>
                <input
                  className="field !h-11"
                  type="tel"
                  value={passenger.phone}
                  autoComplete="tel"
                  placeholder="05XX XXX XX XX"
                  onChange={(event) => setPassenger({ ...passenger, phone: event.target.value })}
                />
              </label>
            </div>
          ) : null}
        </div>

        <button
          type="button"
          role="switch"
          aria-checked={notifyAny}
          onClick={() => setNotify(!notifyAny)}
          className="flex min-h-[62px] items-center gap-3 border-0 border-b border-[#F0F0ED] bg-transparent px-1 text-left"
        >
          <span className="grid h-10 w-10 flex-none place-items-center rounded-xl bg-sk-tint text-sk-brand">
            <Bell size={19} strokeWidth={2} aria-hidden />
          </span>
          <span className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="text-[15px] font-extrabold">İniş bildirimleri</span>
            <span className="text-[13px] text-sk-ink2">
              {notifyAny ? `${stopName} durağına 5 ve 1 km kala haber ver` : 'Kapalı'}
            </span>
          </span>
          <span aria-hidden className="switch" />
        </button>

        <div className="flex min-h-[58px] items-center gap-3 px-1">
          <span className="grid h-10 w-10 flex-none place-items-center rounded-xl bg-sk-bg text-sk-ink">
            <CreditCard size={19} strokeWidth={2} aria-hidden />
          </span>
          <span className="flex flex-1 flex-col gap-0.5">
            <span className="text-[15px] font-extrabold">Demo ödeme</span>
            <span className="text-[13px] text-sk-ink2">
              Kart bilgisi istenmez, para hareketi olmaz
            </span>
          </span>
        </div>

        {error ? (
          <p
            role="alert"
            className="m-0 flex items-start gap-2 rounded-2xl bg-sk-tint px-3.5 py-2.5 text-[13px] font-semibold text-sk-brandInk"
          >
            <TriangleAlert size={16} aria-hidden className="mt-px flex-none" />
            {error}
          </p>
        ) : null}

        <button
          type="button"
          onClick={() => void pay()}
          disabled={busy}
          className="btn btn-brand mt-auto h-[58px] disabled:opacity-90"
        >
          {phase === 'paying' ? (
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden
              className="spin"
            >
              <circle cx="12" cy="12" r="9" stroke="rgba(255,255,255,.35)" strokeWidth="3" />
              <path d="M21 12a9 9 0 0 0-9-9" stroke="#fff" strokeWidth="3" strokeLinecap="round" />
            </svg>
          ) : null}
          {phase === 'paying' ? 'Ödeme alınıyor…' : `${priceLabel} öde`}
        </button>
      </div>

      <div
        aria-hidden={phase !== 'done'}
        role={phase === 'done' ? 'status' : undefined}
        className="pointer-events-none absolute inset-x-5 bottom-[26px] top-6 flex flex-col items-center justify-center gap-3 text-center"
        style={{
          opacity: phase === 'done' ? 1 : 0,
          transform: `scale(${phase === 'done' ? 1 : 0.85})`,
          transition: 'opacity 300ms ease 80ms, transform 640ms cubic-bezier(.34,1.45,.64,1) 80ms',
        }}
      >
        <span className="grid h-[92px] w-[92px] place-items-center rounded-full bg-sk-dark">
          <svg width="44" height="44" viewBox="0 0 24 24" fill="none" aria-hidden>
            {phase === 'done' ? (
              <path
                className="check-draw"
                d="M5 12.5l4.5 4.5L19 7"
                stroke="#FFFFFF"
                strokeWidth="2.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            ) : null}
          </svg>
        </span>
        <h2 className="m-0 mt-2 text-[26px] font-extrabold">Biletin hazır</h2>
        <p className="m-0 text-[15px] text-sk-ink2">
          Koltuk {seatNo} · {summary.departure} · bilet ekranına geçiliyor
        </p>
      </div>
    </BottomSheet>
  );
}
