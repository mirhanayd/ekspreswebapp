import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { createCoachSeatLayout } from '../src/seat-layout.js';
import { buildStopManifest } from '../src/server/driver-stops.js';

const stop = (order: number, locationId: string, name: string, minutes: number) => ({
  locationId,
  stopOrder: order,
  estimatedMinutesFromStart: minutes,
  location: { name },
});

const trip = {
  departureTime: '2026-11-06T14:00:00.000Z',
  route: {
    originId: 'siirt',
    destinationId: 'diyarbakir',
    // Deliberately unordered: the result must follow stop order.
    stops: [
      stop(3, 'batman', 'Batman Otogarı', 90),
      stop(1, 'siirt', 'Siirt Terminali', 0),
      stop(4, 'diyarbakir', 'Diyarbakır Terminali', 180),
      stop(2, 'kurtalan', 'Kurtalan Otogarı', 30),
    ],
  },
};

const passenger = (
  seatNo: string,
  boardingLocationId: string | null,
  alightingLocationId: string | null,
  boardingStatus = 'pending',
) => ({
  ticketId: `ticket-${seatNo}-${boardingLocationId}`,
  ticketNo: `TKT-${seatNo}`,
  seatNo,
  firstName: 'Rojda',
  lastName: 'Aslan',
  phone: '0555 000 70 01',
  boardingLocationId,
  alightingLocationId,
  boardingStatus,
});

describe('stop manifest', () => {
  const manifest = [
    passenger('25', 'siirt', 'batman', 'boarded'),
    passenger('25', 'batman', 'diyarbakir'),
    passenger('9', 'batman', 'diyarbakir'),
    passenger('6', 'kurtalan', 'batman', 'boarded'),
    passenger('1', 'siirt', 'diyarbakir', 'boarded'),
  ];

  it('splits one stop into those getting off and those getting on', () => {
    const view = buildStopManifest(trip, manifest, 'batman');
    expect(view.stop).toEqual({
      locationId: 'batman',
      name: 'Batman Otogarı',
      plannedTime: '2026-11-06T15:30:00.000Z',
      stopOrder: 3,
    });
    expect(view.alighting.map((item) => item.seatNo)).toEqual(['25', '6']);
    expect(view.boarding.map((item) => item.seatNo)).toEqual(['25', '9']);
  });

  it('shows a seat changing hands as two different passengers at that stop', () => {
    const view = buildStopManifest(trip, manifest, 'batman');
    const leaving = view.alighting.find((item) => item.seatNo === '25');
    const joining = view.boarding.find((item) => item.seatNo === '25');
    expect(leaving?.ticketId).not.toBe(joining?.ticketId);
    expect(leaving?.boardingStop.name).toBe('Siirt Terminali');
    expect(joining?.alightingStop.name).toBe('Diyarbakır Terminali');
  });

  it('gives each passenger seat, name, phone, both stops with planned times and status', () => {
    const [first] = buildStopManifest(trip, manifest, 'kurtalan').boarding;
    expect(first).toEqual({
      ticketId: 'ticket-6-kurtalan',
      ticketNo: 'TKT-6',
      seatNo: '6',
      firstName: 'Rojda',
      lastName: 'Aslan',
      phone: '0555 000 70 01',
      boardingStop: {
        locationId: 'kurtalan',
        name: 'Kurtalan Otogarı',
        plannedTime: '2026-11-06T14:30:00.000Z',
      },
      alightingStop: {
        locationId: 'batman',
        name: 'Batman Otogarı',
        plannedTime: '2026-11-06T15:30:00.000Z',
      },
      boardingStatus: 'boarded',
    });
  });

  it('counts every stop in route order for the map bubbles', () => {
    const { stops } = buildStopManifest(trip, manifest, 'siirt');
    expect(stops.map((item) => [item.name, item.alightingCount, item.boardingCount])).toEqual([
      ['Siirt Terminali', 0, 2],
      ['Kurtalan Otogarı', 0, 1],
      ['Batman Otogarı', 2, 2],
      ['Diyarbakır Terminali', 3, 0],
    ]);
  });

  it('does not expect a no-show to get off, while still listing them', () => {
    const view = buildStopManifest(trip, [passenger('7', 'siirt', 'batman', 'no_show')], 'batman');
    expect(view.alighting).toHaveLength(1);
    expect(view.stops.find((item) => item.locationId === 'batman')?.alightingCount).toBe(0);
    expect(view.stops.find((item) => item.locationId === 'siirt')?.boardingCount).toBe(1);
  });

  it('puts a ticket without stops, or with an off-route stop, on the whole route', () => {
    const view = buildStopManifest(
      trip,
      [passenger('2', null, null), passenger('3', 'kapali-durak', 'kapali-durak')],
      'siirt',
    );
    expect(view.boarding.map((item) => item.seatNo)).toEqual(['2', '3']);
    expect(view.boarding[1].alightingStop.locationId).toBe('diyarbakir');
  });

  it('rejects a location that is not on the route', () => {
    expect(() => buildStopManifest(trip, [], 'mardin')).toThrow('güzergâhında');
  });
});

describe('41-seat coach data', () => {
  const layout = createCoachSeatLayout();
  const column = (name: 1 | 2 | 3 | 4) =>
    layout.items
      .filter((item) => item.type === 'seat' && item.column === name)
      .sort((a, b) => a.row - b.row)
      .map((item) => Number(item.seatNo));

  it('matches the agreed seat order', () => {
    expect(column(1)).toEqual([1, 4, 7, 10, 13, 16, 19, 22, 23, 26, 29, 32, 35, 38]);
    expect(column(3)).toEqual([2, 5, 8, 11, 14, 17, 20, 24, 27, 30, 33, 36, 40]);
    expect(column(4)).toEqual([3, 6, 9, 12, 15, 18, 21, 25, 28, 31, 34, 37, 41]);
    expect(column(2)).toEqual([39]);
  });

  it('leaves the eighth row free on the right for the middle door', () => {
    const eighth = layout.items.filter((item) => item.row === 8);
    expect(eighth.map((item) => item.type).sort()).toEqual(['door', 'seat']);
    expect(eighth.find((item) => item.type === 'seat')?.column).toBe(1);
  });

  it('seats 38, 39, 40 and 41 on the last row', () => {
    const last = layout.items.filter((item) => item.type === 'seat' && item.row === 14);
    expect(last.map((item) => item.seatNo).sort()).toEqual(['38', '39', '40', '41']);
  });

  it('is the same layout the migration writes', () => {
    const sql = readFileSync(join(__dirname, '../migrations/0015_coach-41-seats.sql'), 'utf8');
    const literal = sql.match(/'(\{.*?\})'::jsonb/)?.[1];
    expect(JSON.parse(literal as string)).toEqual(layout);
  });
});
