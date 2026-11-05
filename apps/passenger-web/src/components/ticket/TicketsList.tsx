'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Ticket } from 'lucide-react';

export type ListedTicket = {
  id: string;
  dayLabel: string;
  departure: string;
  route: string;
  meta: string;
  live: boolean;
  /** Past list only. */
  day: string;
  month: string;
  cancelled: boolean;
};

/** Aktif / Geçmiş segmented control: the white thumb springs across and the lists slide past each other. */
export function TicketsList({ active, past }: { active: ListedTicket[]; past: ListedTicket[] }) {
  const [segment, setSegment] = useState<'aktif' | 'gecmis'>('aktif');
  const isActive = segment === 'aktif';

  const panel = (shown: boolean, side: -1 | 1): React.CSSProperties => ({
    opacity: shown ? 1 : 0,
    transform: `translateX(${shown ? 0 : side * 24}px)`,
    visibility: shown ? 'visible' : 'hidden',
    transition: `opacity 300ms ease, transform 460ms cubic-bezier(.32,.72,0,1), visibility 0s linear ${shown ? 0 : 460}ms`,
  });

  return (
    <>
      <div
        role="group"
        aria-label="Bilet listesi"
        className="relative grid grid-cols-2 rounded-[18px] bg-[#E6E6E2] p-1"
      >
        <span
          aria-hidden
          className="absolute left-1 top-1 h-11 w-[calc(50%-4px)] rounded-[14px] bg-white"
          style={{
            boxShadow: '0 2px 8px rgba(22,23,27,.08)',
            transform: `translateX(${isActive ? '0%' : '100%'})`,
            transition: 'transform 420ms cubic-bezier(.34,1.3,.64,1)',
          }}
        />
        <button
          type="button"
          aria-pressed={isActive}
          onClick={() => setSegment('aktif')}
          className="relative h-11 border-0 bg-transparent text-[15px] font-extrabold"
        >
          Aktif
        </button>
        <button
          type="button"
          aria-pressed={!isActive}
          onClick={() => setSegment('gecmis')}
          className="relative h-11 border-0 bg-transparent text-[15px] font-extrabold"
        >
          Geçmiş
        </button>
      </div>

      <div className="relative">
        <div aria-hidden={!isActive} className="flex flex-col gap-3" style={panel(isActive, -1)}>
          {active.length ? (
            active.map((ticket) => (
              <Link
                key={ticket.id}
                href={`/tickets/${ticket.id}`}
                aria-label={`${ticket.dayLabel} ${ticket.departure} ${ticket.route} bileti, aç`}
                tabIndex={isActive ? 0 : -1}
                className="flex overflow-hidden rounded-[22px] border border-sk-line bg-white text-inherit no-underline"
              >
                <span
                  className={`flex w-[82px] flex-none flex-col items-center justify-center gap-0.5 py-4 ${
                    ticket.live ? 'bg-sk-dark text-white' : 'bg-sk-bg text-sk-ink'
                  }`}
                >
                  <span className="text-[11px] font-extrabold tracking-[0.1em]">
                    {ticket.dayLabel}
                  </span>
                  <span className="num-md text-[22px] leading-[1.1] [font-stretch:118%]">
                    {ticket.departure}
                  </span>
                </span>
                <span className="relative flex min-w-0 flex-1 flex-col justify-center gap-1 border-l-2 border-dashed border-[#E1E1DC] py-3.5 pl-4 pr-3.5">
                  <span className="text-[17px] font-extrabold">{ticket.route}</span>
                  <span className="text-[13px] text-sk-ink2">{ticket.meta}</span>
                  {ticket.live ? (
                    <span className="inline-flex h-[22px] items-center gap-1.5 self-start rounded-[11px] bg-sk-tint px-2 text-[11px] font-extrabold tracking-[0.06em] text-sk-brandInk">
                      <span aria-hidden className="live-dot h-1.5 w-1.5 text-sk-brand" />
                      YOLDA
                    </span>
                  ) : null}
                </span>
              </Link>
            ))
          ) : (
            <Empty
              title="Aktif biletin yok"
              text="Yeni bir sefer arayıp koltuğunu seçebilirsin."
              action
            />
          )}
        </div>

        <div
          aria-hidden={isActive}
          className="absolute inset-x-0 top-0 flex flex-col gap-3"
          style={panel(!isActive, 1)}
        >
          {past.length ? (
            past.map((ticket) => (
              <Link
                key={ticket.id}
                href={`/tickets/${ticket.id}`}
                tabIndex={isActive ? -1 : 0}
                className="flex min-h-[72px] items-center gap-[14px] rounded-[22px] border border-sk-line bg-white px-4 text-inherit no-underline"
              >
                <span className="flex w-12 flex-none flex-col items-center">
                  <span className="num-md text-xl leading-none [font-stretch:115%]">
                    {ticket.day}
                  </span>
                  <span className="text-xs font-bold text-sk-ink3">{ticket.month}</span>
                </span>
                <span className="flex min-w-0 flex-1 flex-col gap-[3px]">
                  <span className="text-base font-bold">{ticket.route}</span>
                  <span className="text-[13px] text-sk-ink2">{ticket.meta}</span>
                </span>
                <span
                  className={`chip ${ticket.cancelled ? 'bg-sk-tint text-sk-brandInk' : 'bg-sk-okBg text-sk-ok'}`}
                >
                  {ticket.cancelled ? 'İptal' : 'Tamamlandı'}
                </span>
              </Link>
            ))
          ) : (
            <Empty title="Geçmiş yolculuk yok" text="Tamamlanan yolculukların burada listelenir." />
          )}
        </div>
      </div>
    </>
  );
}

function Empty({ title, text, action }: { title: string; text: string; action?: boolean }) {
  return (
    <div className="surface flex flex-col items-center gap-2 px-6 py-10 text-center">
      <span className="grid h-14 w-14 place-items-center rounded-full bg-sk-bg text-sk-ink3">
        <Ticket size={26} aria-hidden />
      </span>
      <h2 className="m-0 text-lg font-extrabold">{title}</h2>
      <p className="m-0 max-w-[260px] text-sm text-sk-ink2">{text}</p>
      {action ? (
        <Link href="/" className="btn btn-brand mt-3 h-12 text-base no-underline">
          Sefer ara
        </Link>
      ) : null}
    </div>
  );
}
