export type SeatLayoutItem = {
  type: 'driver' | 'seat' | 'door';
  row: number;
  column: number;
  seatNo?: string;
};

export type SeatLayout = {
  layout: '2+1';
  rows: number;
  columns: 4;
  items: SeatLayoutItem[];
};

/**
 * The 41-seat 2+1 coach. Column 1 is the single seat, columns 3 and 4 the
 * double seats across the aisle and column 2 only exists on the rear bench
 * (seat 39). Row 8 has no double seats because the middle door sits there.
 */
const LEFT = [1, 4, 7, 10, 13, 16, 19, 22, 23, 26, 29, 32, 35, 38];
const AISLE_SIDE = [2, 5, 8, 11, 14, 17, 20, 0, 24, 27, 30, 33, 36, 40];
const WINDOW_SIDE = [3, 6, 9, 12, 15, 18, 21, 0, 25, 28, 31, 34, 37, 41];
const REAR_CENTER = 39;

export const COACH_SEAT_COUNT = 41;

export function createCoachSeatLayout(): SeatLayout {
  const items: SeatLayoutItem[] = [{ type: 'driver', row: 0, column: 1 }];
  LEFT.forEach((seatNo, index) => {
    const row = index + 1;
    items.push({ type: 'seat', seatNo: String(seatNo), row, column: 1 });
    if (AISLE_SIDE[index]) {
      items.push({ type: 'seat', seatNo: String(AISLE_SIDE[index]), row, column: 3 });
    }
    if (WINDOW_SIDE[index]) {
      items.push({ type: 'seat', seatNo: String(WINDOW_SIDE[index]), row, column: 4 });
    }
    if (!AISLE_SIDE[index]) items.push({ type: 'door', row, column: 3 });
  });
  items.push({ type: 'seat', seatNo: String(REAR_CENTER), row: LEFT.length, column: 2 });
  return { layout: '2+1', rows: LEFT.length, columns: 4, items };
}
