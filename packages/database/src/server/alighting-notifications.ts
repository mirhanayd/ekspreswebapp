import { sql } from 'drizzle-orm';
import { serverDatabase } from './database.js';
import { remainingRoadMeters, type LngLat } from './route-distance.js';

type Database = ReturnType<typeof serverDatabase>;

/** Remaining road distance, in km, at which a passenger is warned. Most distant first. */
export const ALIGHTING_THRESHOLDS_KM = [5, 1] as const;
export type AlightingThreshold = (typeof ALIGHTING_THRESHOLDS_KM)[number];

/** In-app banners are only offered while they are still about the current stretch of road. */
export const IN_APP_BANNER_WINDOW_MS = 10 * 60 * 1000;

const FALLBACK_SPEED_KPH = 54;

export type NotificationPreferences = { km5: boolean; km1: boolean; sound: boolean };
export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  km5: true,
  km1: true,
  sound: true,
};

export type DispatchStatus = 'sent' | 'superseded' | 'disabled';

export type AlightingMessage = {
  title: string;
  body: string;
  tag: string;
};

export type AlightingPayload = AlightingMessage & {
  dispatchId: string;
  ticketId: string;
  tripId: string;
  threshold: AlightingThreshold;
  sound: boolean;
  url: string;
};

/**
 * Which thresholds the bus has newly passed, and how each one is resolved.
 *
 * Only the most urgent newly-crossed threshold is delivered: if a gap in GPS
 * data jumps the bus from 7 km to 0.6 km, a "5 km left" message would be stale,
 * so it is recorded as superseded and never sent. A threshold the passenger
 * switched off is recorded as disabled so enabling it later does not replay it.
 */
export function planAlightingDispatches(input: {
  remainingKm: number;
  recorded: ReadonlySet<number>;
  preferences: NotificationPreferences;
}): Array<{ threshold: AlightingThreshold; status: DispatchStatus }> {
  const crossed = ALIGHTING_THRESHOLDS_KM.filter(
    (threshold) => input.remainingKm <= threshold && !input.recorded.has(threshold),
  );
  if (!crossed.length) return [];
  const urgent = crossed[crossed.length - 1];
  return crossed.map((threshold) => {
    if (threshold !== urgent) return { threshold, status: 'superseded' as const };
    const enabled = threshold === 5 ? input.preferences.km5 : input.preferences.km1;
    return { threshold, status: enabled ? ('sent' as const) : ('disabled' as const) };
  });
}

/** Whole minutes to cover `remainingKm`, from the live speed when the bus is really moving. */
export function estimateMinutes(remainingKm: number, speedKph: number) {
  const speed =
    Number.isFinite(speedKph) && speedKph >= 25 ? Math.min(speedKph, 100) : FALLBACK_SPEED_KPH;
  return Math.max(1, Math.round((remainingKm / speed) * 60));
}

const BACK_VOWELS = 'aıou';
const FRONT_VOWELS = 'eiöü';
const POSSESSIVE_ENDINGS = 'ıiuü';

/** "Batman Otogarı" → "Batman Otogarı’na"; "Kurtalan" → "Kurtalan’a". */
export function turkishDative(name: string) {
  const trimmed = name.trim();
  if (!trimmed) return trimmed;
  const lower = trimmed.toLocaleLowerCase('tr-TR');
  const last = lower[lower.length - 1];
  const vowels = lower
    .split('')
    .filter((char) => BACK_VOWELS.includes(char) || FRONT_VOWELS.includes(char));
  const lastVowel = vowels[vowels.length - 1] ?? 'e';
  const vowel = BACK_VOWELS.includes(lastVowel) ? 'a' : 'e';
  const endsInVowel = BACK_VOWELS.includes(last) || FRONT_VOWELS.includes(last);
  // Place names such as "Otogarı" or "Terminali" are possessive compounds and take an "n" buffer.
  const buffer = !endsInVowel ? '' : POSSESSIVE_ENDINGS.includes(last) ? 'n' : 'y';
  return `${trimmed}’${buffer}${vowel}`;
}

export function buildAlightingMessage(input: {
  threshold: AlightingThreshold;
  stopName: string;
  seatNo: string;
  minutes: number;
  ticketId: string;
}): AlightingMessage {
  const tag = `alighting-${input.ticketId}-${input.threshold}km`;
  if (input.threshold === 5) {
    return {
      title: `${turkishDative(input.stopName)} 5 km kaldı`,
      body: `Yaklaşık ${input.minutes} dakika sonra ineceksin.`,
      tag,
    };
  }
  return {
    title: '1 km kaldı, inişe hazırlan',
    body: `Koltuk ${input.seatNo}’te eşyanı unutma.`,
    tag,
  };
}

// ── Orchestration (storage and push transport are injected) ──────────────────

/** Most push requests in flight at once for one alert. */
export const PUSH_CONCURRENCY = 8;
/** Socket timeout for one push service request, so a stalled endpoint cannot hang GPS ingestion. */
export const PUSH_TIMEOUT_MS = 4000;

/**
 * Runs `task` over `items` with at most `limit` running at a time. Like Promise.allSettled,
 * every item is attempted and a rejection is reported in place instead of stopping the rest.
 */
export async function mapWithConcurrency<T, R>(
  items: readonly T[],
  limit: number,
  task: (item: T) => Promise<R>,
): Promise<PromiseSettledResult<R>[]> {
  const results: PromiseSettledResult<R>[] = new Array(items.length);
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const index = next;
      next += 1;
      [results[index]] = await Promise.allSettled([task(items[index])]);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

export type TrackedPosition = {
  tripId: string;
  longitude: number;
  latitude: number;
  speedKph: number;
};

export type AlightingCandidate = {
  ticketId: string;
  userId: string;
  seatNo: string;
  stopName: string;
  stop: LngLat;
  recorded: ReadonlySet<number>;
  preferences: NotificationPreferences;
};

export type StoredPushSubscription = { endpoint: string; p256dh: string; auth: string };

export type PushResult = 'sent' | 'gone' | 'failed' | 'unconfigured';
export type PushSender = (
  subscription: StoredPushSubscription,
  payload: AlightingPayload,
) => Promise<PushResult>;

export interface AlightingStore {
  listCandidates(tripId: string): Promise<AlightingCandidate[]>;
  loadRouteLine(tripId: string): Promise<LngLat[] | null>;
  /** Inserts the dispatch row; returns its id, or null when this ticket/threshold already has one. */
  claimDispatch(input: {
    ticketId: string;
    tripId: string;
    threshold: AlightingThreshold;
    remainingMeters: number;
    status: DispatchStatus;
  }): Promise<string | null>;
  listSubscriptions(userId: string): Promise<StoredPushSubscription[]>;
  removeSubscription(endpoint: string): Promise<void>;
  markPushed(dispatchId: string): Promise<void>;
}

export function createAlightingNotifier(deps: { store: AlightingStore; send: PushSender }) {
  return {
    /**
     * Called for every accepted GPS fix. Cheap when nothing is due: one query
     * for the trip's active tickets and no geometry load unless a threshold is open.
     */
    async evaluate(position: TrackedPosition) {
      const candidates = await deps.store.listCandidates(position.tripId);
      const open = candidates.filter((candidate) =>
        ALIGHTING_THRESHOLDS_KM.some((threshold) => !candidate.recorded.has(threshold)),
      );
      if (!open.length) return { dispatched: 0 };
      const line = await deps.store.loadRouteLine(position.tripId);
      if (!line || line.length < 2) return { dispatched: 0 };

      const bus: LngLat = [position.longitude, position.latitude];
      let dispatched = 0;
      for (const candidate of open) {
        const remainingMeters = remainingRoadMeters(line, bus, candidate.stop);
        const remainingKm = remainingMeters / 1000;
        const plan = planAlightingDispatches({
          remainingKm,
          recorded: candidate.recorded,
          preferences: candidate.preferences,
        });
        for (const step of plan) {
          const dispatchId = await deps.store.claimDispatch({
            ticketId: candidate.ticketId,
            tripId: position.tripId,
            threshold: step.threshold,
            remainingMeters: Math.round(remainingMeters),
            status: step.status,
          });
          if (!dispatchId || step.status !== 'sent') continue;
          dispatched += 1;
          const message = buildAlightingMessage({
            threshold: step.threshold,
            stopName: candidate.stopName,
            seatNo: candidate.seatNo,
            minutes: estimateMinutes(remainingKm, position.speedKph),
            ticketId: candidate.ticketId,
          });
          const payload: AlightingPayload = {
            ...message,
            dispatchId,
            ticketId: candidate.ticketId,
            tripId: position.tripId,
            threshold: step.threshold,
            sound: candidate.preferences.sound,
            url: `/trips/${position.tripId}/live?ticketId=${candidate.ticketId}`,
          };
          const subscriptions = await deps.store.listSubscriptions(candidate.userId);
          // A slow or failing device must not hold up, or cancel, delivery to the others.
          const results = await mapWithConcurrency(
            subscriptions,
            PUSH_CONCURRENCY,
            async (subscription) => {
              const result = await deps.send(subscription, payload);
              if (result === 'gone') await deps.store.removeSubscription(subscription.endpoint);
              return result;
            },
          );
          const pushed = results.some(
            (result) => result.status === 'fulfilled' && result.value === 'sent',
          );
          if (pushed) await deps.store.markPushed(dispatchId);
        }
      }
      return { dispatched };
    },
  };
}

// ── PostgreSQL store ─────────────────────────────────────────────────────────

export function createSqlAlightingStore(database: () => Database = serverDatabase): AlightingStore {
  return {
    async listCandidates(tripId) {
      const result = await database().execute<{
        ticket_id: string;
        user_id: string;
        seat_no: string;
        stop_name: string;
        lng: number;
        lat: number;
        recorded: number[] | null;
        km5: boolean;
        km1: boolean;
        sound: boolean;
      }>(sql`
        SELECT t.id AS ticket_id, t.user_id, ts.seat_no, l.name AS stop_name,
               ST_X(l.coordinates)::float8 AS lng, ST_Y(l.coordinates)::float8 AS lat,
               ARRAY(SELECT d.threshold_km FROM alighting_notification_dispatches d
                     WHERE d.ticket_id = t.id) AS recorded,
               COALESCE(p.km5, true) AS km5, COALESCE(p.km1, true) AS km1,
               COALESCE(p.sound, true) AS sound
        FROM tickets t
        JOIN trip_seats ts ON ts.id = t.trip_seat_id
        JOIN orders o ON o.id = t.order_id
        JOIN trips tr ON tr.id = t.trip_id
        JOIN routes r ON r.id = tr.route_id
        JOIN locations l ON l.id = COALESCE(o.alighting_location_id, r.destination_id)
        LEFT JOIN passenger_boarding pb ON pb.ticket_id = t.id
        LEFT JOIN notification_preferences p ON p.user_id = t.user_id
        WHERE t.trip_id = ${tripId}
          AND t.status = 'active'
          AND l.coordinates IS NOT NULL
          AND COALESCE(pb.status, 'pending') <> 'no_show'
      `);
      return result.rows.map((row) => ({
        ticketId: row.ticket_id,
        userId: row.user_id,
        seatNo: row.seat_no,
        stopName: row.stop_name,
        stop: [Number(row.lng), Number(row.lat)] as LngLat,
        recorded: new Set((row.recorded ?? []).map(Number)),
        preferences: { km5: row.km5, km1: row.km1, sound: row.sound },
      }));
    },

    async loadRouteLine(tripId) {
      const result = await database().execute<{ geometry: string | null }>(sql`
        SELECT ST_AsGeoJSON(r.geometry)::text AS geometry
        FROM trips tr JOIN routes r ON r.id = tr.route_id
        WHERE tr.id = ${tripId}
      `);
      const geometry = result.rows[0]?.geometry;
      if (!geometry) return null;
      return (JSON.parse(geometry) as { coordinates: LngLat[] }).coordinates;
    },

    async claimDispatch(input) {
      const result = await database().execute<{ id: string }>(sql`
        INSERT INTO alighting_notification_dispatches
          (ticket_id, trip_id, threshold_km, remaining_m, status)
        VALUES (${input.ticketId}, ${input.tripId}, ${input.threshold},
                ${input.remainingMeters}, ${input.status})
        ON CONFLICT (ticket_id, threshold_km) DO NOTHING
        RETURNING id
      `);
      return result.rows[0]?.id ?? null;
    },

    async listSubscriptions(userId) {
      const result = await database().execute<StoredPushSubscription>(sql`
        SELECT endpoint, p256dh, auth FROM push_subscriptions WHERE user_id = ${userId}
      `);
      return result.rows;
    },

    async removeSubscription(endpoint) {
      await database().execute(sql`DELETE FROM push_subscriptions WHERE endpoint = ${endpoint}`);
    },

    async markPushed(dispatchId) {
      await database().execute(sql`
        UPDATE alighting_notification_dispatches SET push_sent_at = now() WHERE id = ${dispatchId}
      `);
    },
  };
}

// ── Web Push transport (VAPID keys are server-only) ──────────────────────────

export function vapidConfigured(env: NodeJS.ProcessEnv = process.env) {
  return Boolean(env.VAPID_PUBLIC_KEY && env.VAPID_PRIVATE_KEY && env.VAPID_SUBJECT);
}

export const webPushSender: PushSender = async (subscription, payload) => {
  if (!vapidConfigured()) return 'unconfigured';
  try {
    const webpush = (await import('web-push')).default;
    const response = await webpush.sendNotification(
      {
        endpoint: subscription.endpoint,
        keys: { p256dh: subscription.p256dh, auth: subscription.auth },
      },
      JSON.stringify(payload),
      {
        TTL: 120,
        timeout: PUSH_TIMEOUT_MS,
        urgency: 'high',
        topic: payload.tag.slice(0, 32).replace(/[^A-Za-z0-9_-]/g, ''),
        vapidDetails: {
          subject: process.env.VAPID_SUBJECT as string,
          publicKey: process.env.VAPID_PUBLIC_KEY as string,
          privateKey: process.env.VAPID_PRIVATE_KEY as string,
        },
      },
    );
    return response.statusCode >= 200 && response.statusCode < 300 ? 'sent' : 'failed';
  } catch (error) {
    const status = (error as { statusCode?: number }).statusCode;
    return status === 404 || status === 410 ? 'gone' : 'failed';
  }
};

export const alightingNotifier = createAlightingNotifier({
  store: createSqlAlightingStore(),
  send: webPushSender,
});
