import { describe, expect, it, vi } from 'vitest';
import {
  buildAlightingMessage,
  createAlightingNotifier,
  DEFAULT_NOTIFICATION_PREFERENCES,
  estimateMinutes,
  planAlightingDispatches,
  turkishDative,
  type AlightingCandidate,
  type AlightingStore,
  type PushSender,
} from '../src/server/alighting-notifications.js';
import { alongLineMeters, remainingRoadMeters, type LngLat } from '../src/server/route-distance.js';
import { createCoachSeatLayout } from '../src/seat-layout.js';
import {
  validatePreferencesInput,
  validatePushSubscription,
} from '../src/server/notification-service.js';

// A due-east line along latitude 37.9: one degree of longitude is about 87.9 km.
const KM_PER_DEGREE = 87.9;
const line: LngLat[] = [
  [41.0, 37.9],
  [41.5, 37.9],
  [42.0, 37.9],
];
const stop: LngLat = [42.0, 37.9];
const atKmBefore = (km: number): LngLat => [42.0 - km / KM_PER_DEGREE, 37.9];

describe('road distance along the route', () => {
  it('measures along the line, not as the crow flies', () => {
    const bent: LngLat[] = [
      [41.0, 37.9],
      [41.0, 38.0],
      [41.1, 38.0],
    ];
    const direct = Math.hypot(0.1 * 87.9, 0.1 * 111.2) * 1000;
    const road = remainingRoadMeters(bent, bent[0], bent[2]);
    expect(road).toBeGreaterThan(direct * 1.3);
    expect(road).toBeCloseTo(alongLineMeters(bent, bent[2]), 6);
  });

  it('is close to the planar distance on a straight line and zero once the stop is passed', () => {
    expect(remainingRoadMeters(line, atKmBefore(5), stop) / 1000).toBeCloseTo(5, 1);
    expect(remainingRoadMeters(line, atKmBefore(1), stop) / 1000).toBeCloseTo(1, 1);
    expect(remainingRoadMeters(line, [42.2, 37.9], stop)).toBe(0);
  });

  it('projects an off-route fix onto the nearest part of the line', () => {
    const offRoute: LngLat = [atKmBefore(3)[0], 37.905];
    expect(remainingRoadMeters(line, offRoute, stop) / 1000).toBeCloseTo(3, 1);
  });
});

describe('threshold planning', () => {
  const prefs = DEFAULT_NOTIFICATION_PREFERENCES;

  it('does nothing above 5 km', () => {
    expect(
      planAlightingDispatches({ remainingKm: 5.2, recorded: new Set(), preferences: prefs }),
    ).toEqual([]);
  });

  it('sends the 5 km alert the first time the bus is at or under 5 km', () => {
    expect(
      planAlightingDispatches({ remainingKm: 4.9, recorded: new Set(), preferences: prefs }),
    ).toEqual([{ threshold: 5, status: 'sent' }]);
  });

  it('never repeats a threshold that is already recorded', () => {
    expect(
      planAlightingDispatches({ remainingKm: 3, recorded: new Set([5]), preferences: prefs }),
    ).toEqual([]);
    expect(
      planAlightingDispatches({ remainingKm: 0.4, recorded: new Set([5, 1]), preferences: prefs }),
    ).toEqual([]);
  });

  it('sends only the most urgent alert when both thresholds are crossed at once', () => {
    expect(
      planAlightingDispatches({ remainingKm: 0.8, recorded: new Set(), preferences: prefs }),
    ).toEqual([
      { threshold: 5, status: 'superseded' },
      { threshold: 1, status: 'sent' },
    ]);
  });

  it('records a switched-off threshold as disabled so it cannot replay later', () => {
    expect(
      planAlightingDispatches({
        remainingKm: 4,
        recorded: new Set(),
        preferences: { ...prefs, km5: false },
      }),
    ).toEqual([{ threshold: 5, status: 'disabled' }]);
    expect(
      planAlightingDispatches({ remainingKm: 4, recorded: new Set([5]), preferences: prefs }),
    ).toEqual([]);
  });
});

describe('message copy', () => {
  it('uses the Turkish dative with the right vowel and buffer letter', () => {
    expect(turkishDative('Batman Otogarı')).toBe('Batman Otogarı’na');
    expect(turkishDative('Siirt Terminali')).toBe('Siirt Terminali’ne');
    expect(turkishDative('Kurtalan')).toBe('Kurtalan’a');
    expect(turkishDative('Diyarbakır Şehirlerarası Terminali')).toBe(
      'Diyarbakır Şehirlerarası Terminali’ne',
    );
  });

  it('builds the 5 km and 1 km notifications', () => {
    const base = { stopName: 'Batman Otogarı', seatNo: '28', ticketId: 't1' };
    expect(buildAlightingMessage({ ...base, threshold: 5, minutes: 6 })).toEqual({
      title: 'Batman Otogarı’na 5 km kaldı',
      body: 'Yaklaşık 6 dakika sonra ineceksin.',
      tag: 'alighting-t1-5km',
    });
    expect(buildAlightingMessage({ ...base, threshold: 1, minutes: 1 })).toEqual({
      title: '1 km kaldı, inişe hazırlan',
      body: 'Koltuk 28’te eşyanı unutma.',
      tag: 'alighting-t1-1km',
    });
  });

  it('estimates minutes from live speed and falls back when the bus is nearly stopped', () => {
    expect(estimateMinutes(5, 60)).toBe(5);
    expect(estimateMinutes(5, 0)).toBe(6);
    expect(estimateMinutes(0.1, 80)).toBe(1);
  });
});

function fakeStore(candidate: Partial<AlightingCandidate> = {}) {
  const dispatches = new Map<string, { id: string; status: string; pushed: boolean }>();
  const recorded = new Set<number>();
  const removed: string[] = [];
  const store: AlightingStore = {
    listCandidates: vi.fn(async () => [
      {
        ticketId: 'ticket-1',
        userId: 'user-1',
        seatNo: '28',
        stopName: 'Batman Otogarı',
        stop,
        recorded: new Set(recorded),
        preferences: DEFAULT_NOTIFICATION_PREFERENCES,
        ...candidate,
      },
    ]),
    loadRouteLine: vi.fn(async () => line),
    claimDispatch: vi.fn(async ({ ticketId, threshold, status }) => {
      const key = `${ticketId}:${threshold}`;
      if (dispatches.has(key)) return null;
      dispatches.set(key, { id: `d-${threshold}`, status, pushed: false });
      recorded.add(threshold);
      return `d-${threshold}`;
    }),
    listSubscriptions: vi.fn(async () => [
      { endpoint: 'https://push.example/one', p256dh: 'k', auth: 'a' },
      { endpoint: 'https://push.example/gone', p256dh: 'k', auth: 'a' },
    ]),
    removeSubscription: vi.fn(async (endpoint: string) => {
      removed.push(endpoint);
    }),
    markPushed: vi.fn(async (id: string) => {
      for (const entry of dispatches.values()) if (entry.id === id) entry.pushed = true;
    }),
  };
  return { store, dispatches, removed };
}

const fix = (km: number, speedKph = 60) => ({
  tripId: 'trip-1',
  longitude: atKmBefore(km)[0],
  latitude: atKmBefore(km)[1],
  speedKph,
});

describe('alighting notifier', () => {
  it('pushes each threshold exactly once across many GPS fixes', async () => {
    const { store, dispatches } = fakeStore();
    const send = vi.fn<PushSender>(async () => 'sent');
    const notifier = createAlightingNotifier({ store, send });

    for (const km of [8, 6, 5.4, 4.8, 4.2, 3, 2, 1.2, 0.9, 0.6, 0.2]) {
      await notifier.evaluate(fix(km));
    }

    const thresholds = send.mock.calls.map((call) => call[1].threshold);
    // Two subscriptions per alert, one alert per threshold.
    expect(thresholds.filter((threshold) => threshold === 5)).toHaveLength(2);
    expect(thresholds.filter((threshold) => threshold === 1)).toHaveLength(2);
    expect([...dispatches.keys()].sort()).toEqual(['ticket-1:1', 'ticket-1:5']);
    expect(send.mock.calls[0][1]).toMatchObject({
      title: 'Batman Otogarı’na 5 km kaldı',
      url: '/trips/trip-1/live?ticketId=ticket-1',
      sound: true,
    });
    expect(send.mock.calls[2][1].title).toBe('1 km kaldı, inişe hazırlan');
  });

  it('skips geometry and further work once both thresholds are recorded', async () => {
    const { store } = fakeStore({ recorded: new Set([5, 1]) });
    const notifier = createAlightingNotifier({ store, send: vi.fn(async () => 'sent' as const) });
    await expect(notifier.evaluate(fix(0.3))).resolves.toEqual({ dispatched: 0 });
    expect(store.loadRouteLine).not.toHaveBeenCalled();
  });

  it('does not push for a switched-off threshold but still records it', async () => {
    const { store, dispatches } = fakeStore({
      preferences: { km5: false, km1: true, sound: false },
    });
    const send = vi.fn<PushSender>(async () => 'sent');
    const notifier = createAlightingNotifier({ store, send });
    await notifier.evaluate(fix(4.5));
    expect(send).not.toHaveBeenCalled();
    expect(dispatches.get('ticket-1:5')?.status).toBe('disabled');
    await notifier.evaluate(fix(0.8));
    expect(send.mock.calls[0][1]).toMatchObject({ threshold: 1, sound: false });
  });

  it('survives concurrent ingestion: only the request that claims the row sends', async () => {
    const { store } = fakeStore();
    const send = vi.fn<PushSender>(async () => 'sent');
    const notifier = createAlightingNotifier({ store, send });
    await Promise.all([notifier.evaluate(fix(4.9)), notifier.evaluate(fix(4.8))]);
    // Two subscriptions but a single claimed dispatch.
    expect(send).toHaveBeenCalledTimes(2);
  });

  it('drops gone subscriptions and marks the dispatch pushed only on delivery', async () => {
    const { store, removed, dispatches } = fakeStore();
    const send: PushSender = async (subscription) =>
      subscription.endpoint.endsWith('/gone') ? 'gone' : 'sent';
    await createAlightingNotifier({ store, send }).evaluate(fix(4.5));
    expect(removed).toEqual(['https://push.example/gone']);
    expect(dispatches.get('ticket-1:5')?.pushed).toBe(true);
  });

  it('leaves the dispatch unpushed when push is unconfigured so the in-app banner can show it', async () => {
    const { store, dispatches } = fakeStore();
    await createAlightingNotifier({ store, send: async () => 'unconfigured' }).evaluate(fix(4.5));
    expect(dispatches.get('ticket-1:5')).toMatchObject({ status: 'sent', pushed: false });
  });
});

describe('notification input validation', () => {
  it('accepts partial boolean preferences and rejects anything else', () => {
    expect(validatePreferencesInput({ km5: false })).toEqual({ km5: false });
    expect(() => validatePreferencesInput({ km1: 'yes' })).toThrow('km1');
    expect(() => validatePreferencesInput(null)).toThrow();
  });

  it('requires an https endpoint and both keys', () => {
    const ok = {
      endpoint: 'https://fcm.googleapis.com/send/abc',
      keys: { p256dh: 'p', auth: 'a' },
    };
    expect(validatePushSubscription(ok)).toEqual(ok);
    expect(() => validatePushSubscription({ ...ok, endpoint: 'http://insecure' })).toThrow();
    expect(() =>
      validatePushSubscription({ endpoint: ok.endpoint, keys: { p256dh: 'p' } }),
    ).toThrow();
  });
});

describe('41-seat coach layout', () => {
  it('has 41 uniquely numbered seats with the door gap and the rear bench', () => {
    const layout = createCoachSeatLayout();
    const seats = layout.items.filter((item) => item.type === 'seat');
    expect(seats).toHaveLength(41);
    expect(new Set(seats.map((seat) => seat.seatNo)).size).toBe(41);
    expect(seats.find((seat) => seat.seatNo === '39')).toMatchObject({ column: 2, row: 14 });
    expect(layout.items.some((item) => item.type === 'door')).toBe(true);
  });
});
