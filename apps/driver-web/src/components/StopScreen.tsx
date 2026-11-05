'use client';

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { ArrowDown, ArrowRight, ArrowUp, Check, ChevronLeft, List, Phone, X } from 'lucide-react';
import { BusPlan, type StopFilter } from './BusPlan';
import { PassengerCard, type CardEntry, type MarkStatus } from './PassengerCard';
import { ablative, formatTime, locative } from '@/lib/format';
import type { SeatLayoutItem } from '@/lib/seat-plan';
import { seatState, stopCounts, type Person, type TripStop } from '@/lib/trip-model';

type Phase = 'closed' | 'pre' | 'open' | 'closing';
type Geometry = {
  shift: number;
  origin: { x: number; y: number };
  focus: { x: number; y: number } | null;
};

const CLOSE_MS = 440;
/** Gap kept between the raised seat and the sheet's top edge. */
const SEAT_CLEARANCE = 52;
const HEADER_HEIGHT = 148;

function PlanIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M7 2h10a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2zM8.5 7h2.5M13 7h2.5M8.5 11h2.5M13 11h2.5M8.5 15h2.5M13 15h2.5" />
    </svg>
  );
}

export function StopScreen({
  visible,
  items,
  people,
  stops,
  index,
  seatsIn,
  revealed,
  popSeat,
  onBack,
  onLeave,
  onMark,
}: {
  visible: boolean;
  items: SeatLayoutItem[];
  people: Person[];
  stops: TripStop[];
  index: number;
  seatsIn: boolean;
  revealed: boolean;
  popSeat: string | null;
  onBack: () => void;
  onLeave: () => void;
  onMark: MarkStatus;
}) {
  const stop = stops[index];
  const last = index === stops.length - 1;
  const [mode, setMode] = useState<'plan' | 'liste'>('plan');
  const [filter, setFilter] = useState<StopFilter>('all');
  const [seat, setSeat] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>('closed');
  const [geometry, setGeometry] = useState<Geometry>({
    shift: 0,
    origin: { x: 195, y: 0 },
    focus: null,
  });
  const root = useRef<HTMLDivElement>(null);
  const sheet = useRef<HTMLElement>(null);
  const timers = useRef<number[]>([]);
  const phaseRef = useRef(phase);
  phaseRef.current = phase;

  useEffect(() => () => timers.current.forEach((timer) => window.clearTimeout(timer)), []);
  useEffect(() => {
    setMode('plan');
    setFilter('all');
    setSeat(null);
    setPhase('closed');
  }, [index]);

  const counts = useMemo(() => stopCounts(people, index), [index, people]);

  const entries = useMemo<CardEntry[]>(() => {
    if (!seat) return [];
    const state = seatState(people, seat, index);
    const list: CardEntry[] = [];
    if (state.alighting) list.push({ person: state.alighting, role: 'down' });
    if (state.boarding) list.push({ person: state.boarding, role: 'up' });
    if (!list.length && state.through) list.push({ person: state.through, role: 'stay' });
    return list;
  }, [index, people, seat]);

  const open = useCallback(
    (seatNo: string) => {
      if (phase !== 'closed') return;
      setSeat(seatNo);
      setPhase('pre');
    },
    [phase],
  );

  // With the sheet laid out but still hidden, work out how far the bus must slide and where the
  // sheet should grow from, then start both motions in the same frame.
  useLayoutEffect(() => {
    if (phase !== 'pre' || !seat || !root.current || !sheet.current) return;
    const area = root.current.getBoundingClientRect();
    const sheetHeight = sheet.current.offsetHeight;
    const sheetTop = area.height - sheetHeight;
    const target = root.current.querySelector<HTMLElement>(
      mode === 'plan' ? `[data-seat="${seat}"] .seat-shape` : `[data-row="${seat}"]`,
    );
    const rect = target?.getBoundingClientRect();
    const centerX = rect ? rect.left - area.left + rect.width / 2 : area.width / 2;
    const centerY = rect ? rect.top - area.top + rect.height / 2 : sheetTop;
    const shift =
      mode === 'plan'
        ? Math.max(0, Math.min(centerY - (sheetTop - SEAT_CLEARANCE), centerY - HEADER_HEIGHT - 34))
        : 0;
    setGeometry({
      shift,
      origin: { x: centerX, y: centerY - shift - sheetTop },
      focus: rect && mode === 'plan' ? { x: rect.left - area.left, y: rect.top - area.top } : null,
    });
    const frame = requestAnimationFrame(() => setPhase('open'));
    return () => cancelAnimationFrame(frame);
  }, [mode, phase, seat]);

  const close = useCallback((after?: () => void) => {
    if (phaseRef.current === 'closed') return;
    setPhase('closing');
    timers.current.push(
      window.setTimeout(() => {
        setPhase('closed');
        setSeat(null);
        setGeometry((value) => ({ ...value, shift: 0 }));
        after?.();
      }, CLOSE_MS),
    );
  }, []);

  const markFromCard = useCallback<MarkStatus>(
    (person, status, label) => close(() => onMark(person, status, label)),
    [close, onMark],
  );

  const downRows = useMemo(
    () =>
      people
        .filter(
          (person) =>
            person.to === index && (person.status === 'boarded' || person.status === 'alighted'),
        )
        .sort((a, b) => Number(a.seat) - Number(b.seat)),
    [index, people],
  );
  const upRows = useMemo(
    () =>
      people
        .filter((person) => person.from === index)
        .sort((a, b) => Number(a.seat) - Number(b.seat)),
    [index, people],
  );
  const pending =
    downRows.filter((person) => person.status === 'boarded').length +
    upRows.filter((person) => person.status === 'pending').length;

  const eyebrow =
    index === 0
      ? 'Kalkış durağı'
      : last
        ? `Son durak · ${formatTime(stop.time)}`
        : `Vardınız · ${formatTime(stop.time)}`;
  const plan = mode === 'plan';
  const raised = phase === 'open' && plan;
  const focused = seat ? seatState(people, seat, index) : null;

  const list = (
    <>
      {downRows.length && filter !== 'up' ? (
        <section className="group" data-tone="down">
          <h2>
            <i aria-hidden />
            {locative(stop.short)} inecekler
            <span>
              {counts.downDone}/{downRows.length}
            </span>
          </h2>
          {downRows.map((person, row) => (
            <ListRow
              key={person.id}
              person={person}
              role="down"
              row={row}
              stops={stops}
              onOpen={open}
              onMark={onMark}
            />
          ))}
        </section>
      ) : null}
      {upRows.length && filter !== 'down' ? (
        <section className="group" data-tone="up">
          <h2>
            <i aria-hidden />
            {ablative(stop.short)} binecekler
            <span>
              {counts.upDone + counts.upNo}/{upRows.length}
            </span>
          </h2>
          {upRows.map((person, row) => (
            <ListRow
              key={person.id}
              person={person}
              role="up"
              row={row + downRows.length}
              stops={stops}
              onOpen={open}
              onMark={onMark}
            />
          ))}
        </section>
      ) : null}
      {!downRows.length && !upRows.length ? (
        <p className="empty">Bu durakta inen ya da binen yolcu yok.</p>
      ) : null}
    </>
  );

  return (
    <div ref={root} className="stop" data-on={visible} aria-hidden={!visible}>
      <header className="stop-head">
        <div className="stop-title">
          <button
            type="button"
            className="round"
            aria-label={index === 0 ? 'Ana ekrana dön' : 'Haritaya dön'}
            onClick={onBack}
          >
            <ChevronLeft size={20} strokeWidth={2.4} aria-hidden />
          </button>
          <div>
            <span className="here">
              <i aria-hidden />
              {eyebrow}
            </span>
            <h1>{stop.name}</h1>
          </div>
          <div className="segment" role="group" aria-label="Görünüm" data-mode={mode}>
            <span aria-hidden />
            <button
              type="button"
              aria-label="Otobüs planı"
              aria-pressed={plan}
              onClick={() => setMode('plan')}
            >
              <PlanIcon />
            </button>
            <button
              type="button"
              aria-label="Yolcu listesi"
              aria-pressed={!plan}
              onClick={() => setMode('liste')}
            >
              <List size={20} aria-hidden />
            </button>
          </div>
        </div>
        <div className="filters">
          <FilterBox
            tone="down"
            label="İnecek"
            Icon={ArrowDown}
            total={counts.down}
            progress={counts.down ? `${counts.downDone}/${counts.down} indi` : 'İnen yok'}
            percent={counts.down ? (counts.downDone / counts.down) * 100 : 0}
            active={filter === 'down'}
            muted={filter === 'up'}
            onToggle={() => setFilter((value) => (value === 'down' ? 'all' : 'down'))}
          />
          <FilterBox
            tone="up"
            label="Binecek"
            Icon={ArrowUp}
            total={counts.up}
            progress={
              counts.up
                ? `${counts.upDone}/${counts.up} bindi${counts.upNo ? ` · ${counts.upNo} gelmedi` : ''}`
                : 'Binen yok'
            }
            percent={counts.up ? ((counts.upDone + counts.upNo) / counts.up) * 100 : 0}
            active={filter === 'up'}
            muted={filter === 'down'}
            onToggle={() => setFilter((value) => (value === 'up' ? 'all' : 'up'))}
          />
        </div>
      </header>

      <div className="pane pane-plan" data-on={plan} aria-hidden={!plan}>
        <BusPlan
          items={items}
          people={people}
          stop={stop}
          stops={stops}
          filter={filter}
          seatsIn={seatsIn}
          revealed={revealed}
          popSeat={popSeat}
          shift={raised ? geometry.shift : 0}
          onOpen={open}
        />
      </div>

      <div className="pane pane-list" data-on={!plan} aria-hidden={plan}>
        {list}
      </div>

      <footer className="stop-foot">
        <button type="button" className="leave" data-ready={!pending} onClick={onLeave}>
          <span>{last ? 'Seferi bitir' : index === 0 ? 'Seferi başlat' : 'Duraktan ayrıl'}</span>
          <small>
            {pending ? `${pending} yolcu bekliyor` : 'Hepsi tamam'}
            <ArrowRight size={18} strokeWidth={2.4} aria-hidden />
          </small>
        </button>
      </footer>

      <button
        type="button"
        className="scrim"
        tabIndex={-1}
        aria-label="Kapat"
        data-on={phase === 'open' || phase === 'pre'}
        data-mounted={phase !== 'closed'}
        onClick={() => close()}
      />

      {geometry.focus && seat && focused ? (
        <div
          aria-hidden
          className="seat-focus"
          data-kind={focused.kind}
          data-on={raised}
          style={{
            left: geometry.focus.x,
            top: geometry.focus.y,
            transform: `translateY(${raised ? -geometry.shift : 0}px) scale(${raised ? 1.16 : 1})`,
          }}
        >
          <span className="seat-back" />
          <span className="seat-no">{seat}</span>
        </div>
      ) : null}

      <PassengerCard
        ref={sheet}
        entries={entries}
        stops={stops}
        stopIndex={index}
        phase={phase}
        origin={geometry.origin}
        onClose={() => close()}
        onMark={markFromCard}
      />
    </div>
  );
}

function FilterBox({
  tone,
  label,
  Icon,
  total,
  progress,
  percent,
  active,
  muted,
  onToggle,
}: {
  tone: 'down' | 'up';
  label: string;
  Icon: typeof ArrowDown;
  total: number;
  progress: string;
  percent: number;
  active: boolean;
  muted: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      className="filter"
      data-tone={tone}
      data-active={active}
      data-muted={muted || total === 0}
      aria-pressed={active}
      disabled={total === 0}
      onClick={onToggle}
    >
      <span className="filter-icon">
        <Icon size={18} strokeWidth={3} aria-hidden />
      </span>
      <span className="filter-text">
        <b>{label}</b>
        <small>{progress}</small>
      </span>
      <strong className="num">{total}</strong>
      <span aria-hidden className="filter-bar">
        <i style={{ width: `${percent}%` }} />
      </span>
    </button>
  );
}

function ListRow({
  person,
  role,
  row,
  stops,
  onOpen,
  onMark,
}: {
  person: Person;
  role: 'down' | 'up';
  row: number;
  stops: TripStop[];
  onOpen: (seat: string) => void;
  onMark: MarkStatus;
}) {
  const waiting = role === 'down' ? person.status === 'boarded' : person.status === 'pending';
  const noShow = person.status === 'no_show';
  const sub =
    role === 'down'
      ? `${stops[person.from]?.short} → ${stops[person.to]?.short}${person.phone ? ` · ${person.phone}` : ''}`
      : `→ ${stops[person.to]?.name}`;
  return (
    <div
      className="row"
      data-row={person.seat}
      style={{ '--i': Math.min(row, 12) } as React.CSSProperties}
    >
      <button
        type="button"
        className="row-open"
        aria-label={`${person.name}, koltuk ${person.seat}, ayrıntıları aç`}
        onClick={() => onOpen(person.seat)}
      >
        <span className="row-seat" data-tone={waiting ? role : 'done'}>
          {person.seat}
        </span>
        <span className="row-text">
          <strong data-struck={noShow}>{person.name}</strong>
          <small>{sub}</small>
        </span>
      </button>
      {waiting ? (
        <button
          type="button"
          className="quick"
          data-tone={role}
          aria-label={`${person.name} ${role === 'down' ? 'indi' : 'bindi'} olarak işaretle`}
          onClick={() =>
            role === 'down'
              ? onMark(person, 'alighted', `${person.name} indi`)
              : onMark(person, 'boarded', `${person.name} bindi`)
          }
        >
          {role === 'down' ? (
            <ArrowDown size={15} strokeWidth={3.2} aria-hidden />
          ) : (
            <Check size={15} strokeWidth={3.2} aria-hidden />
          )}
          {role === 'down' ? 'İndi' : 'Bindi'}
        </button>
      ) : (
        <span className="done-chip" data-tone={noShow ? 'noshow' : role}>
          {noShow ? (
            <X size={13} strokeWidth={3.4} aria-hidden />
          ) : (
            <Check size={13} strokeWidth={3.4} aria-hidden />
          )}
          {noShow ? 'Gelmedi' : role === 'down' ? 'İndi' : 'Bindi'}
        </span>
      )}
    </div>
  );
}

/** "X yolcu henüz binmedi": shown when leaving a stop with passengers still waiting to board. */
export function LeaveSheet({
  open,
  people,
  onWait,
  onGo,
}: {
  open: boolean;
  people: Person[];
  onWait: () => void;
  onGo: () => void;
}) {
  return (
    <>
      <button
        type="button"
        className="scrim"
        tabIndex={-1}
        aria-label="Kapat"
        data-on={open}
        data-mounted={open}
        onClick={onWait}
      />
      <section
        className="sheet leave-sheet"
        data-on={open}
        aria-hidden={!open}
        aria-label="Bekleyen yolcular"
      >
        <span aria-hidden className="grip" />
        <div className="leave-text">
          <h2>{people.length} yolcu henüz binmedi</h2>
          <p>
            Ayrılırsan bu yolcular “Gelmedi” olarak işaretlenir ve operasyon ekibine bildirilir.
          </p>
        </div>
        <div className="leave-list">
          {people.slice(0, 4).map((person) => (
            <div key={person.id} className="leave-row">
              <span className="row-seat" data-tone="up">
                {person.seat}
              </span>
              <span className="row-text">
                <strong>{person.name}</strong>
                <small>{person.phone ?? 'Telefon kayıtlı değil'}</small>
              </span>
              {person.phone ? (
                <a
                  className="call"
                  href={`tel:${person.phone.replace(/\s/g, '')}`}
                  aria-label={`${person.name} adlı yolcuyu ara`}
                >
                  <Phone size={18} fill="currentColor" aria-hidden />
                </a>
              ) : null}
            </div>
          ))}
          {people.length > 4 ? (
            <p className="leave-more">ve {people.length - 4} yolcu daha</p>
          ) : null}
        </div>
        <div className="leave-actions">
          <button type="button" className="action" data-tone="ghost" onClick={onWait}>
            Beklemeye devam
          </button>
          <button type="button" className="action" data-tone="primary" onClick={onGo}>
            Gelmedi say, ayrıl
          </button>
        </div>
      </section>
    </>
  );
}
