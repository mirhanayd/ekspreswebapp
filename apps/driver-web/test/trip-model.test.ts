import { describe, expect, it } from 'vitest';
import type { Trip } from '../src/components/DriverProvider';
import { ablative, dative, locative } from '../src/lib/format';
import { labelsPerSide, placeLabels, placeSeats, type SeatLayoutItem } from '../src/lib/seat-plan';
import {
  firstNames,
  initialProgress,
  isWaiting,
  seatState,
  stopCounts,
  tripPeople,
  tripStops,
  type Person,
} from '../src/lib/trip-model';

const person = (patch: Partial<Person>): Person => ({
  id: patch.seat ?? 'x',
  seat: '1',
  name: 'Rojda Aslan',
  first: 'Rojda',
  short: 'Rojda A.',
  phone: null,
  from: 0,
  to: 3,
  status: 'pending',
  ...patch,
});

describe('seat state at a stop', () => {
  const kind = (people: Person[], stop = 2) => seatState(people, '1', stop).kind;

  it('is empty without a passenger and occupied by someone riding through', () => {
    expect(kind([])).toBe('empty');
    expect(kind([person({ from: 0, to: 3, status: 'boarded' })])).toBe('occ');
  });

  it('marks alighting and boarding passengers and their finished states', () => {
    expect(kind([person({ to: 2, status: 'boarded' })])).toBe('down');
    expect(kind([person({ to: 2, status: 'alighted' })])).toBe('downDone');
    expect(kind([person({ from: 2, status: 'pending' })])).toBe('up');
    expect(kind([person({ from: 2, status: 'boarded' })])).toBe('upDone');
    expect(kind([person({ from: 2, status: 'no_show' })])).toBe('noshow');
  });

  it('shows both passengers on a seat that changes hands at this stop', () => {
    const leaving = person({ id: 'a', to: 2, status: 'boarded' });
    const joining = person({ id: 'b', from: 2, to: 3, status: 'pending' });
    const state = seatState([leaving, joining], '1', 2);
    expect(state.kind).toBe('swap');
    expect(state.alighting?.id).toBe('a');
    expect(state.boarding?.id).toBe('b');
  });

  it('frees the seat for the boarding passenger once the other one has left', () => {
    const left = person({ id: 'a', to: 2, status: 'alighted' });
    const joining = person({ id: 'b', from: 2, to: 3, status: 'pending' });
    expect(kind([left, joining])).toBe('up');
  });
});

describe('stop counts', () => {
  const people = [
    person({ id: '1', to: 1, status: 'alighted' }),
    person({ id: '2', to: 1, status: 'boarded' }),
    person({ id: '3', to: 1, status: 'no_show' }),
    person({ id: '4', from: 1, status: 'boarded' }),
    person({ id: '5', from: 1, status: 'no_show' }),
    person({ id: '6', from: 1, status: 'pending' }),
  ];

  it('leaves no-shows out of those getting off but counts them among those getting on', () => {
    expect(stopCounts(people, 1)).toEqual({ down: 2, downDone: 1, up: 3, upDone: 1, upNo: 1 });
  });

  it('treats only unhandled passengers as waiting', () => {
    expect(people.filter((item) => isWaiting(item, 1)).map((item) => item.id)).toEqual(['2', '6']);
  });

  it('shortens long name lists', () => {
    const names = ['Ali', 'Veli', 'Ayşe', 'Fatma', 'Zeki'].map((first) => person({ first }));
    expect(firstNames(names)).toBe('Ali, Veli, Ayşe +2');
    expect(firstNames([])).toBe('Kimse yok');
  });
});

describe('trip mapping', () => {
  const stop = (order: number, locationId: string, longitude: number) => ({
    id: `stop-${order}`,
    locationId,
    stopOrder: order,
    estimatedMinutesFromStart: order * 30,
    location: {
      id: locationId,
      name: `Durak ${order}`,
      type: 'terminal',
      coordinates: { type: 'Point', coordinates: [longitude, 37.9] },
    },
    passengers: [],
  });
  const trip = (patch: Partial<Trip>) =>
    ({
      status: 'in_transit',
      departureTime: '2026-11-05T09:00:00.000Z',
      latestPosition: null,
      route: {
        // Deliberately unordered: the server sorts, but the model must not rely on it.
        stops: [stop(3, 'c', 42), stop(1, 'a', 41), stop(2, 'b', 41.5)],
        geometry: null,
      },
      manifest: [],
      ...patch,
    }) as unknown as Trip;

  it('orders stops and times them from departure', () => {
    const stops = tripStops(trip({}));
    expect(stops.map((item) => item.short)).toEqual(['Durak', 'Durak', 'Durak']);
    expect(stops.map((item) => item.index)).toEqual([0, 1, 2]);
    expect(stops[1].time.toISOString()).toBe('2026-11-05T10:00:00.000Z');
    expect(stops[0].point?.longitude).toBe(41);
  });

  it('maps a ticket onto stop indexes, defaulting to the whole route', () => {
    const passenger = {
      ticketId: 't',
      seatNo: '7',
      firstName: 'Ali Rıza',
      lastName: 'Keskin',
      phone: null,
      boardingLocationId: null,
      alightingLocationId: null,
      boardingStatus: 'pending',
    };
    const [whole, leg] = tripPeople(
      trip({
        manifest: [
          passenger,
          { ...passenger, boardingLocationId: 'b', alightingLocationId: 'c' },
        ] as Trip['manifest'],
      }),
    );
    expect([whole.from, whole.to]).toEqual([0, 2]);
    expect([leg.from, leg.to]).toEqual([1, 2]);
    expect(whole.short).toBe('Ali Rıza K.');
  });

  it('resumes from the trip status and the last GPS fix', () => {
    const line: Array<[number, number]> = [
      [41, 37.9],
      [41.5, 37.9],
      [42, 37.9],
    ];
    const at = (longitude: number) =>
      trip({ latestPosition: { longitude, latitude: 37.9 } as Trip['latestPosition'] });
    const stops = tripStops(trip({}));
    expect(initialProgress(trip({ status: 'boarding' }), stops, line)).toEqual({
      stop: 0,
      view: 'durak',
    });
    expect(initialProgress(trip({}), stops, line)).toEqual({ stop: 1, view: 'yolda' });
    expect(initialProgress(at(41.2), stops, line)).toEqual({ stop: 1, view: 'yolda' });
    expect(initialProgress(at(41.7), stops, line)).toEqual({ stop: 2, view: 'yolda' });
    expect(initialProgress(at(41.999), stops, line)).toEqual({ stop: 2, view: 'durak' });
  });
});

describe('seat plan', () => {
  const items: SeatLayoutItem[] = Array.from({ length: 14 }, (_, row) => [
    { type: 'seat', seatNo: `L${row}`, row: row + 1, column: 1 },
    { type: 'seat', seatNo: `R${row}`, row: row + 1, column: 4 },
  ]).flat();
  const plan = placeSeats([...items, { type: 'door', row: 8, column: 3 }]);

  it('places the door on the row without double seats', () => {
    expect(plan.doorCenter).toBe(332);
    expect(plan.canvasHeight).toBe(600);
  });

  it('keeps stacked labels apart and at least 44 px tall', () => {
    const left = plan.seats.filter((seat) => seat.side === 'L').slice(0, 6);
    const labels = placeLabels(
      left.map((seat) => ({ seat, lines: 1 })),
      plan.canvasHeight,
    ).sort((a, b) => a.top - b.top);
    expect(labels).toHaveLength(6);
    for (let index = 1; index < labels.length; index += 1) {
      expect(labels[index].height).toBeGreaterThanOrEqual(44);
      expect(labels[index].top).toBeGreaterThanOrEqual(
        labels[index - 1].top + labels[index - 1].height,
      );
    }
  });

  it('pushes a column back onto the plan when it would run off the bottom', () => {
    const left = plan.seats.filter((seat) => seat.side === 'L').slice(-8);
    const labels = placeLabels(
      left.map((seat) => ({ seat, lines: 2 })),
      plan.canvasHeight,
    );
    const lowest = Math.max(...labels.map((label) => label.top + label.height));
    expect(lowest).toBeLessThanOrEqual(plan.canvasHeight);
  });

  it('knows how many labels one margin can hold', () => {
    expect(labelsPerSide(plan.canvasHeight)).toBe(13);
  });
});

describe('Turkish place suffixes', () => {
  it('follows vowel harmony and hard consonants', () => {
    expect(dative('Batman')).toBe('Batman’a');
    expect(dative('Siirt')).toBe('Siirt’e');
    expect(locative('Kurtalan')).toBe('Kurtalan’da');
    expect(locative('Siirt')).toBe('Siirt’te');
    expect(ablative('Diyarbakır')).toBe('Diyarbakır’dan');
    expect(ablative('Siirt')).toBe('Siirt’ten');
  });
});
