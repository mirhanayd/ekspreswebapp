'use client';

export type SeatLayoutItem = { type: string; seatNo?: string; row: number; column: number };
export type SeatStatus = 'available' | 'held' | 'purchased' | 'blocked';

export type SeatPlacement = {
  seatNo: string;
  /** Position inside the 390 x (map height) design canvas. */
  x: number;
  y: number;
  side: 'L' | 'R';
  kind: string;
};

const CANVAS_W = 390;
const BODY_X = 104;
const BODY_W = 183;
const BODY_TOP = 21;
const SEAT_W = 38;
const SEAT_H = 32;
const ROW_STEP = 36;
const FIRST_ROW_Y = 85;

/** Column → x offset inside the bus: single seat, rear centre, aisle side, window side. */
const COLUMN_X: Record<number, number> = { 1: 0, 2: 39, 3: 78, 4: 121 };
const COLUMN_KIND: Record<number, string> = {
  1: 'Tekli koltuk',
  2: 'Arka orta',
  3: 'Koridor',
  4: 'Cam kenarı',
};

export function seatKind(column: number) {
  return COLUMN_KIND[column] ?? 'Koltuk';
}

/** Lays the bus out from its stored seat layout; works for any row count. */
export function placeSeats(items: SeatLayoutItem[]) {
  const seatItems = items.filter((item) => item.type === 'seat' && item.seatNo);
  const firstRow = Math.min(...seatItems.map((item) => item.row), 1);
  const rows = Math.max(...seatItems.map((item) => item.row - firstRow + 1), 1);
  const seats = seatItems.map<SeatPlacement>((item) => ({
    seatNo: item.seatNo as string,
    x: BODY_X + 12 + COLUMN_X[item.column],
    y: FIRST_ROW_Y + (item.row - firstRow) * ROW_STEP,
    side: item.column <= 2 ? 'L' : 'R',
    kind: seatKind(item.column),
  }));
  const door = items.find((item) => item.type === 'door');
  const doorRow = door ? door.row - firstRow : null;
  const bodyHeight = 118 + (rows - 1) * ROW_STEP;
  return { seats, rows, doorRow, bodyHeight, canvasHeight: BODY_TOP + bodyHeight + 21 };
}

type Colors = { bg: string; border: string; back: string; fg: string };

function colorsFor(status: SeatStatus | 'selected'): Colors {
  if (status === 'selected')
    return { bg: '#C8231B', border: '#C8231B', back: '#9E1A13', fg: '#FFFFFF' };
  if (status === 'available')
    return { bg: '#FFFFFF', border: '#C9C9C3', back: '#E7E7E2', fg: '#3F434B' };
  return { bg: '#DCDCD6', border: '#DCDCD6', back: '#CDCDC6', fg: '#8F939A' };
}

const STATUS_LABEL: Record<SeatStatus | 'selected', string> = {
  available: 'boş',
  selected: 'seçildi',
  held: 'geçici ayrılmış',
  purchased: 'dolu',
  blocked: 'dolu',
};

/**
 * 41-seat coach plan as an SVG body with real buttons laid over it. Everything
 * sits on a 390-wide design canvas and is positioned in percentages so the map
 * scales with the screen. The selected seat is red and a label ("Koltuk 28 ·
 * Cam kenarı") glides next to it.
 */
export function SeatMap({
  items,
  statusOf,
  selectedSeat,
  popSeat,
  onPick,
}: {
  items: SeatLayoutItem[];
  statusOf: (seatNo: string) => SeatStatus;
  selectedSeat: string | null;
  popSeat: string | null;
  onPick: (seatNo: string) => void;
}) {
  const { seats, doorRow, bodyHeight, canvasHeight } = placeSeats(items);
  const pctX = (value: number) => `${(value / CANVAS_W) * 100}%`;
  const pctY = (value: number) => `${(value / canvasHeight) * 100}%`;
  const selected = seats.find((seat) => seat.seatNo === selectedSeat);
  const doorCenter = doorRow === null ? null : 80 + doorRow * ROW_STEP;
  const h = bodyHeight;

  const outline =
    doorCenter === null
      ? `M183 58V${h - 14}A14 14 0 0 1 169 ${h}H14A14 14 0 0 1 0 ${h - 14}V30A30 30 0 0 1 30 0H153A30 30 0 0 1 183 30V20`
      : `M183 58V${doorCenter - 19}M183 ${doorCenter + 19}V${h - 14}A14 14 0 0 1 169 ${h}H14A14 14 0 0 1 0 ${h - 14}V30A30 30 0 0 1 30 0H153A30 30 0 0 1 183 30V20`;

  return (
    <div
      className="relative mx-auto w-full max-w-[390px]"
      style={{ aspectRatio: `${CANVAS_W} / ${canvasHeight}` }}
    >
      <svg
        viewBox={`0 0 ${BODY_W} ${h}`}
        aria-hidden
        className="absolute overflow-visible"
        style={{
          left: pctX(BODY_X),
          top: pctY(BODY_TOP),
          width: pctX(BODY_W),
          height: `${(h / canvasHeight) * 100}%`,
          filter: 'drop-shadow(0 18px 30px rgba(22,23,27,.10))',
        }}
      >
        <rect x="-8" y="26" width="9" height="20" rx="3" fill="#D1D1CB" />
        <rect x="182" y="26" width="9" height="20" rx="3" fill="#D1D1CB" />
        <path
          d={`M30 0H153A30 30 0 0 1 183 30V${h - 14}A14 14 0 0 1 169 ${h}H14A14 14 0 0 1 0 ${h - 14}V30A30 30 0 0 1 30 0Z`}
          fill="#FFFFFF"
        />
        <rect x="51" y="62" width="38" height={h - 116} rx="8" fill="#F5F5F2" />
        <path d={outline} fill="none" stroke="#D1D1CB" strokeWidth="2" />
        <path
          d={`M183 22V56${doorCenter === null ? '' : `M183 ${doorCenter - 17}V${doorCenter + 17}`}`}
          stroke="#C8231B"
          strokeOpacity=".45"
          strokeWidth="2"
          strokeDasharray="3 4"
        />
        <path
          d="M18 15Q91.5 3 165 15"
          fill="none"
          stroke="#C2C2BB"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <circle cx="31" cy="42" r="11" fill="none" stroke="#A0A4AB" strokeWidth="2.5" />
        <path d="M20 42H42M31 42V53" stroke="#A0A4AB" strokeWidth="2" />
        <circle cx="31" cy="42" r="3" fill="#A0A4AB" />
        <text
          x="172"
          y="42"
          textAnchor="end"
          fill="#6A6F78"
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
            fill="#6A6F78"
            fontSize="9"
            fontWeight="700"
            letterSpacing="1"
          >
            KAPI
          </text>
        )}
        <path d={`M62 ${h - 8}H121`} stroke="#E1E1DC" strokeWidth="3" strokeLinecap="round" />
      </svg>

      {seats.map((seat) => {
        const status = statusOf(seat.seatNo);
        const isSelected = selectedSeat === seat.seatNo;
        const colors = colorsFor(isSelected ? 'selected' : status);
        const disabled = !isSelected && status !== 'available';
        return (
          <button
            key={seat.seatNo}
            type="button"
            disabled={disabled}
            aria-pressed={isSelected}
            aria-label={`Koltuk ${seat.seatNo}, ${seat.kind}, ${STATUS_LABEL[isSelected ? 'selected' : status]}`}
            onClick={() => onPick(seat.seatNo)}
            className="absolute border-0 bg-transparent p-0"
            style={{
              left: pctX(seat.x),
              top: pctY(seat.y),
              width: pctX(SEAT_W),
              height: pctY(SEAT_H),
              cursor: disabled ? 'not-allowed' : 'pointer',
              transform: `scale(${popSeat === seat.seatNo ? 1.2 : 1})`,
              transition: 'transform 420ms cubic-bezier(.34,1.56,.64,1)',
            }}
          >
            <span
              className="absolute inset-0 box-border rounded-lg"
              style={{
                background: colors.bg,
                border: `1.5px solid ${colors.border}`,
                transition: 'background 280ms ease, border-color 280ms ease',
              }}
            />
            <span
              className="absolute bottom-[3px] left-[3px] right-[3px] h-[5px] rounded-[3px]"
              style={{ background: colors.back, transition: 'background 280ms ease' }}
            />
            <span
              className="absolute inset-x-0 top-[5px] text-center text-xs font-bold leading-4 [font-stretch:82%]"
              style={{ color: colors.fg, transition: 'color 280ms ease' }}
            >
              {seat.seatNo}
            </span>
          </button>
        );
      })}

      <div
        aria-hidden
        className="pointer-events-none absolute z-[2] flex flex-col gap-px whitespace-nowrap rounded-xl bg-sk-dark px-[11px] py-[7px] text-white"
        style={{
          left: pctX(selected ? (selected.side === 'L' ? BODY_X - 8 : BODY_X + BODY_W + 8) : 195),
          top: pctY(selected ? selected.y - 6 : 300),
          opacity: selected ? 1 : 0,
          transform: `translateX(${selected?.side === 'L' ? '-100%' : '0%'}) scale(${selected ? 1 : 0.6})`,
          transformOrigin: selected?.side === 'L' ? '100% 50%' : '0% 50%',
          transition:
            'left 420ms cubic-bezier(.34,1.3,.64,1), top 420ms cubic-bezier(.34,1.3,.64,1), transform 420ms cubic-bezier(.34,1.56,.64,1), opacity 220ms ease',
          boxShadow: '0 10px 24px rgba(22,23,27,.25)',
        }}
      >
        <span className="text-sm font-extrabold">Koltuk {selected?.seatNo}</span>
        <span className="text-[11px] text-[#C9CCD3]">{selected?.kind}</span>
      </div>
    </div>
  );
}
