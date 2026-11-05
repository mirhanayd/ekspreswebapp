'use client';

import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowDown, ArrowUp, Check, X } from 'lucide-react';
import {
  BODY_LEFT,
  BODY_TOP,
  BODY_WIDTH,
  CANVAS_WIDTH,
  labelsPerSide,
  placeLabels,
  placeSeats,
  type SeatLayoutItem,
} from '@/lib/seat-plan';
import { ablative, locative } from '@/lib/format';
import { isWaiting, seatState, type Person, type SeatKind, type TripStop } from '@/lib/trip-model';

export type StopFilter = 'all' | 'down' | 'up';

const BADGE: Partial<Record<SeatKind, 'down' | 'up' | 'check' | 'x'>> = {
  down: 'down',
  swap: 'up',
  up: 'up',
  upDone: 'check',
  downDone: 'check',
  noshow: 'x',
};

const BADGE_ICON = { down: ArrowDown, up: ArrowUp, check: Check, x: X };

function relation(kind: SeatKind): 'down' | 'up' | 'both' | 'none' {
  if (kind === 'down' || kind === 'downDone') return 'down';
  if (kind === 'up' || kind === 'upDone' || kind === 'noshow') return 'up';
  return kind === 'swap' ? 'both' : 'none';
}

function seatAria(
  no: string,
  state: ReturnType<typeof seatState>,
  stop: TripStop,
  stops: TripStop[],
) {
  const who: string[] = [];
  const { alighting: a, boarding: b, through: t } = state;
  if (a)
    who.push(`${a.name}${a.status === 'alighted' ? ' indi' : ` ${locative(stop.short)} iniyor`}`);
  if (b) {
    const text =
      b.status === 'pending'
        ? ` ${ablative(stop.short)} biniyor`
        : b.status === 'no_show'
          ? ' gelmedi'
          : ' bindi';
    who.push(`${b.name}${text}`);
  }
  if (!a && !b && t) who.push(`${t.name}, ${stops[t.to]?.short} yolcusu`);
  return `Koltuk ${no}${who.length ? `: ${who.join(', ')}` : ', boş'}`;
}

type LabelLine = { person: Person; role: 'down' | 'up'; done: boolean };

/**
 * Top-down coach plan. The body is an SVG; seats and name labels are real buttons on the same
 * 390-wide canvas. Each seat button is a 44 px touch box around its 38 x 32 drawing, so the boxes
 * only overlap in the gaps between seats.
 */
function BusPlanView({
  items,
  people,
  stop,
  stops,
  filter,
  seatsIn,
  revealed,
  popSeat,
  shift,
  onOpen,
}: {
  items: SeatLayoutItem[];
  people: Person[];
  stop: TripStop;
  stops: TripStop[];
  filter: StopFilter;
  seatsIn: boolean;
  revealed: boolean;
  popSeat: string | null;
  shift: number;
  onOpen: (seatNo: string) => void;
}) {
  const box = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const { seats, bodyHeight, canvasHeight, doorCenter } = useMemo(() => placeSeats(items), [items]);
  const h = bodyHeight;

  // The plan is drawn for a 390 px screen; narrower phones get it scaled to fit, not clipped.
  useEffect(() => {
    const element = box.current;
    if (!element) return;
    const observer = new ResizeObserver(() =>
      setZoom(Math.min(1, element.clientWidth / CANVAS_WIDTH)),
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const states = useMemo(
    () => new Map(seats.map((seat) => [seat.no, seatState(people, seat.no, stop.index)])),
    [people, seats, stop.index],
  );

  const labels = useMemo(() => {
    const entries = seats.flatMap((seat) => {
      const state = states.get(seat.no);
      const lines: LabelLine[] = [];
      if (state?.alighting) {
        lines.push({
          person: state.alighting,
          role: 'down',
          done: state.alighting.status === 'alighted',
        });
      }
      if (state?.boarding) {
        lines.push({
          person: state.boarding,
          role: 'up',
          done: state.boarding.status !== 'pending',
        });
      }
      return lines.length ? [{ seat, lines }] : [];
    });
    // Past ten people the plan shows only who still needs attention.
    const shown =
      entries.length <= 10
        ? entries
        : entries.filter((entry) => entry.lines.some((line) => isWaiting(line.person, stop.index)));
    const capacity = labelsPerSide(canvasHeight);
    const fits = (['L', 'R'] as const).every(
      (side) => shown.filter((entry) => entry.seat.side === side).length <= capacity,
    );
    if (!fits) return [];
    const placed = placeLabels(
      shown.map((entry) => ({ seat: entry.seat, lines: entry.lines.length })),
      canvasHeight,
    );
    return placed.map((label) => ({
      ...label,
      lines: shown.find((entry) => entry.seat.no === label.seatNo)?.lines ?? [],
    }));
  }, [canvasHeight, seats, states, stop.index]);

  const outline =
    doorCenter === null
      ? `M183 58V${h - 14}A14 14 0 0 1 169 ${h}H14A14 14 0 0 1 0 ${h - 14}V30A30 30 0 0 1 30 0H153A30 30 0 0 1 183 30V20`
      : `M183 58V${doorCenter - 19}M183 ${doorCenter + 19}V${h - 14}A14 14 0 0 1 169 ${h}H14A14 14 0 0 1 0 ${h - 14}V30A30 30 0 0 1 30 0H153A30 30 0 0 1 183 30V20`;

  return (
    <div ref={box} className="plan-box">
      <div className="plan-shift" style={{ transform: `translateY(${-shift}px)` }}>
        <div
          className="plan-canvas"
          data-in={seatsIn}
          data-revealed={revealed}
          style={{ height: canvasHeight, zoom }}
        >
          <svg
            width={BODY_WIDTH}
            height={h}
            viewBox={`0 0 ${BODY_WIDTH} ${h}`}
            aria-hidden
            className="plan-body"
            style={{ left: BODY_LEFT, top: BODY_TOP }}
          >
            <rect x="-8" y="26" width="9" height="20" rx="3" fill="#2B2F37" />
            <rect x="182" y="26" width="9" height="20" rx="3" fill="#2B2F37" />
            <path
              d={`M30 0H153A30 30 0 0 1 183 30V${h - 14}A14 14 0 0 1 169 ${h}H14A14 14 0 0 1 0 ${h - 14}V30A30 30 0 0 1 30 0Z`}
              fill="#14161A"
            />
            <rect x="51" y="62" width="38" height={h - 116} rx="8" fill="#101215" />
            <path d={outline} fill="none" stroke="#3A3F49" strokeWidth="2" />
            <path
              d={`M183 22V56${doorCenter === null ? '' : `M183 ${doorCenter - 17}V${doorCenter + 17}`}`}
              stroke="#4DA3FF"
              strokeOpacity=".6"
              strokeWidth="2"
              strokeDasharray="3 4"
            />
            <path
              d="M18 15Q91.5 3 165 15"
              fill="none"
              stroke="#4A505B"
              strokeWidth="2"
              strokeLinecap="round"
            />
            <circle cx="31" cy="42" r="11" fill="none" stroke="#6B7280" strokeWidth="2.5" />
            <path d="M20 42H42M31 42V53" stroke="#6B7280" strokeWidth="2" />
            <circle cx="31" cy="42" r="3" fill="#6B7280" />
            <text
              x="172"
              y="42"
              textAnchor="end"
              fill="#7D8592"
              fontSize="9"
              fontWeight="700"
              letterSpacing="1"
            >
              KAPI
            </text>
            {doorCenter === null ? null : (
              <text
                x="172"
                y={doorCenter + 4}
                textAnchor="end"
                fill="#7D8592"
                fontSize="9"
                fontWeight="700"
                letterSpacing="1"
              >
                KAPI
              </text>
            )}
            <path d={`M62 ${h - 8}H121`} stroke="#2B2F37" strokeWidth="3" strokeLinecap="round" />
          </svg>

          {labels.map((label, index) => (
            <span key={`line-${label.seatNo}`} aria-hidden>
              <span
                className="plan-link"
                data-tone={linkTone(label.lines)}
                style={{
                  left: label.line.x,
                  top: label.line.y,
                  width: label.line.length,
                  transform: `rotate(${label.line.angle}deg)`,
                  transitionDelay: revealed ? '0ms' : `${560 + index * 70}ms`,
                }}
              />
              <span
                className="plan-link-dot"
                data-tone={linkTone(label.lines)}
                style={{
                  left: label.line.endX,
                  top: label.line.endY,
                  transitionDelay: revealed ? '0ms' : `${560 + index * 70}ms`,
                }}
              />
            </span>
          ))}

          {seats.map((seat) => {
            const state = states.get(seat.no) as ReturnType<typeof seatState>;
            const related = relation(state.kind);
            const dim =
              (filter === 'down' && related !== 'down' && related !== 'both') ||
              (filter === 'up' && related !== 'up' && related !== 'both');
            const badge = BADGE[state.kind];
            const Icon = badge ? BADGE_ICON[badge] : null;
            return (
              <button
                key={seat.no}
                type="button"
                className="seat"
                data-seat={seat.no}
                data-kind={state.kind}
                data-dim={dim}
                data-pop={popSeat === seat.no}
                disabled={state.kind === 'empty'}
                aria-label={seatAria(seat.no, state, stop, stops)}
                onClick={() => onOpen(seat.no)}
                style={
                  {
                    left: seat.x - 3,
                    top: seat.y - 6,
                    '--delay': `${revealed ? seat.row * 12 : 40 + seat.row * 32}ms`,
                    '--badge-delay': `${revealed ? 0 : 420 + seat.row * 32}ms`,
                  } as React.CSSProperties
                }
              >
                <span className="seat-shape">
                  <span className="seat-back" />
                  <span className="seat-no">{seat.no}</span>
                  {Icon ? (
                    <span className="seat-badge">
                      <Icon size={9} strokeWidth={4} aria-hidden />
                    </span>
                  ) : null}
                </span>
              </button>
            );
          })}

          {labels.map((label, index) => {
            const dim =
              (filter === 'down' && !label.lines.some((line) => line.role === 'down')) ||
              (filter === 'up' && !label.lines.some((line) => line.role === 'up'));
            return (
              <button
                key={label.seatNo}
                type="button"
                className="plan-label"
                data-side={label.side}
                data-dim={dim}
                aria-label={`${label.lines.map((line) => line.person.short).join(' ve ')}, koltuk ${label.seatNo} bilgisini aç`}
                onClick={() => onOpen(label.seatNo)}
                style={{
                  left: label.side === 'L' ? undefined : label.x,
                  right: label.side === 'L' ? CANVAS_WIDTH - label.x : undefined,
                  top: label.top,
                  height: label.height,
                  transitionDelay: revealed ? '0ms' : `${560 + index * 70}ms`,
                }}
              >
                <span className="plan-pill">
                  {label.lines.map((line) => (
                    <span
                      key={line.person.id}
                      className="plan-line"
                      data-dim={
                        (filter === 'up' && line.role === 'down') ||
                        (filter === 'down' && line.role === 'up')
                      }
                    >
                      <span className="plan-chip" data-role={line.role} data-done={line.done}>
                        {line.done ? (
                          line.person.status === 'no_show' ? (
                            <X size={10} strokeWidth={4} aria-hidden />
                          ) : (
                            <Check size={10} strokeWidth={4} aria-hidden />
                          )
                        ) : (
                          label.seatNo
                        )}
                      </span>
                      <span
                        className="plan-name"
                        data-done={line.done}
                        data-struck={line.person.status === 'no_show'}
                      >
                        {line.person.short}
                      </span>
                    </span>
                  ))}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function linkTone(lines: LabelLine[]) {
  if (lines.some((line) => line.role === 'down' && !line.done)) return 'down';
  if (lines.some((line) => line.role === 'up' && !line.done)) return 'up';
  return 'done';
}

export const BusPlan = memo(BusPlanView);
