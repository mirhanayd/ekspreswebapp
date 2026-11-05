export type SeatLayoutItem = { type: string; seatNo?: string; row: number; column: number };

export const CANVAS_WIDTH = 390;
export const BODY_LEFT = 104;
export const BODY_WIDTH = 183;
export const BODY_TOP = 7;
export const SEAT_WIDTH = 38;
export const SEAT_HEIGHT = 32;
const ROW_STEP = 36;
const FIRST_ROW_Y = 71;
const SEAT_LEFT = 116;

/** Column → x offset: single seat, rear centre, aisle side, window side. */
const COLUMN_X: Record<number, number> = { 1: 0, 2: 39, 3: 78, 4: 121 };

/** Left labels end here, right labels start here. */
const LABEL_LEFT_EDGE = 94;
const LABEL_RIGHT_EDGE = 297;
/** A label's button is never shorter than a touch target, whatever its text height. */
const LABEL_MIN_HIT = 44;
const LABEL_GAP = 2;

export type PlacedSeat = {
  no: string;
  x: number;
  y: number;
  row: number;
  side: 'L' | 'R';
};

export function placeSeats(items: SeatLayoutItem[]) {
  const seatItems = items.filter((item) => item.type === 'seat' && item.seatNo);
  const firstRow = Math.min(...seatItems.map((item) => item.row), 1);
  const rows = Math.max(...seatItems.map((item) => item.row - firstRow + 1), 1);
  const seats = seatItems.map<PlacedSeat>((item) => ({
    no: item.seatNo as string,
    x: SEAT_LEFT + (COLUMN_X[item.column] ?? 0),
    y: FIRST_ROW_Y + (item.row - firstRow) * ROW_STEP,
    row: item.row - firstRow,
    side: item.column <= 2 ? 'L' : 'R',
  }));
  const door = items.find((item) => item.type === 'door');
  const bodyHeight = 118 + (rows - 1) * ROW_STEP;
  return {
    seats,
    bodyHeight,
    canvasHeight: BODY_TOP + bodyHeight + BODY_TOP,
    doorCenter: door ? 80 + (door.row - firstRow) * ROW_STEP : null,
  };
}

export type LabelInput = { seat: PlacedSeat; lines: number };

export type PlacedLabel = {
  seatNo: string;
  side: 'L' | 'R';
  /** Top of the touch box; the visible pill is centred inside it. */
  top: number;
  height: number;
  x: number;
  /** Connector from the label edge to the seat's side of the bus. */
  line: { x: number; y: number; length: number; angle: number; endX: number; endY: number };
};

function labelHeight(lines: number) {
  return Math.max(LABEL_MIN_HIT, 10 + lines * 18 + (lines - 1) * 2);
}

/**
 * Labels sit in the margins beside the bus. Each side is walked top to bottom, pushing a label
 * down past the one above it, then the whole column is pushed back up if it ran off the plan.
 */
export function placeLabels(inputs: LabelInput[], canvasHeight: number): PlacedLabel[] {
  const placed: PlacedLabel[] = [];
  for (const side of ['L', 'R'] as const) {
    const column = inputs
      .filter((input) => input.seat.side === side)
      .map((input) => ({
        input,
        center: input.seat.y + SEAT_HEIGHT / 2,
        height: labelHeight(input.lines),
        top: 0,
      }))
      .sort((a, b) => a.center - b.center);

    let bottom = Number.NEGATIVE_INFINITY;
    for (const label of column) {
      label.top = Math.max(label.center - label.height / 2, bottom + LABEL_GAP);
      bottom = label.top + label.height;
    }
    let limit = canvasHeight;
    for (let index = column.length - 1; index >= 0; index -= 1) {
      const label = column[index];
      label.top = Math.min(label.top, limit - label.height);
      limit = label.top - LABEL_GAP;
    }

    for (const label of column) {
      const x = side === 'L' ? LABEL_LEFT_EDGE : LABEL_RIGHT_EDGE;
      const y = label.top + label.height / 2;
      const endX = side === 'L' ? BODY_LEFT : BODY_LEFT + BODY_WIDTH;
      const endY = label.center;
      const dx = endX - x;
      const dy = endY - y;
      placed.push({
        seatNo: label.input.seat.no,
        side,
        top: label.top,
        height: label.height,
        x,
        line: {
          x,
          y: y - 1,
          length: Math.hypot(dx, dy),
          angle: (Math.atan2(dy, dx) * 180) / Math.PI,
          endX,
          endY,
        },
      });
    }
  }
  return placed;
}

/** How many labels fit in one margin of the plan. */
export function labelsPerSide(canvasHeight: number) {
  return Math.floor((canvasHeight + LABEL_GAP) / (LABEL_MIN_HIT + LABEL_GAP));
}
