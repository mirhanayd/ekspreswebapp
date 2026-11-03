import { sql } from 'drizzle-orm';
import {
  buildAlightingMessage,
  DEFAULT_NOTIFICATION_PREFERENCES,
  estimateMinutes,
  IN_APP_BANNER_WINDOW_MS,
  type AlightingMessage,
  type AlightingThreshold,
  type NotificationPreferences,
} from './alighting-notifications.js';
import { serverDatabase } from './database.js';
import { ServerError } from './errors.js';

type Database = ReturnType<typeof serverDatabase>;

export type PushSubscriptionInput = {
  endpoint: string;
  keys: { p256dh: string; auth: string };
};

export type InAppAlightingBanner = AlightingMessage & {
  id: string;
  ticketId: string;
  tripId: string;
  threshold: AlightingThreshold;
};

function uuid(value: string, field: string) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) {
    throw new ServerError(400, `${field} geçerli bir UUID olmalıdır.`);
  }
  return value;
}

export function validatePreferencesInput(input: unknown): Partial<NotificationPreferences> {
  if (!input || typeof input !== 'object') throw new ServerError(400, 'Geçersiz istek.');
  const value = input as Record<string, unknown>;
  const result: Partial<NotificationPreferences> = {};
  for (const key of ['km5', 'km1', 'sound'] as const) {
    if (value[key] === undefined) continue;
    if (typeof value[key] !== 'boolean') throw new ServerError(400, `${key} geçersizdir.`);
    result[key] = value[key] as boolean;
  }
  return result;
}

export function validatePushSubscription(input: unknown): PushSubscriptionInput {
  if (!input || typeof input !== 'object') throw new ServerError(400, 'Geçersiz abonelik.');
  const value = input as { endpoint?: unknown; keys?: { p256dh?: unknown; auth?: unknown } };
  const { endpoint, keys } = value;
  if (
    typeof endpoint !== 'string' ||
    endpoint.length > 2048 ||
    !/^https:\/\/[^\s]+$/.test(endpoint) ||
    !keys ||
    typeof keys.p256dh !== 'string' ||
    typeof keys.auth !== 'string' ||
    !keys.p256dh ||
    !keys.auth ||
    keys.p256dh.length > 256 ||
    keys.auth.length > 64
  ) {
    throw new ServerError(400, 'Geçersiz abonelik.');
  }
  return { endpoint, keys: { p256dh: keys.p256dh, auth: keys.auth } };
}

export function createNotificationService(database: () => Database = serverDatabase) {
  return {
    async getPreferences(userId: string): Promise<NotificationPreferences> {
      uuid(userId, 'userId');
      const result = await database().execute<NotificationPreferences>(sql`
        SELECT km5, km1, sound FROM notification_preferences WHERE user_id = ${userId}
      `);
      return result.rows[0] ?? { ...DEFAULT_NOTIFICATION_PREFERENCES };
    },

    async setPreferences(userId: string, rawInput: unknown): Promise<NotificationPreferences> {
      uuid(userId, 'userId');
      const patch = validatePreferencesInput(rawInput);
      const next = { ...(await this.getPreferences(userId)), ...patch };
      await database().execute(sql`
        INSERT INTO notification_preferences (user_id, km5, km1, sound, updated_at)
        VALUES (${userId}, ${next.km5}, ${next.km1}, ${next.sound}, now())
        ON CONFLICT (user_id) DO UPDATE
          SET km5 = EXCLUDED.km5, km1 = EXCLUDED.km1, sound = EXCLUDED.sound, updated_at = now()
      `);
      return next;
    },

    async saveSubscription(userId: string, rawInput: unknown, userAgent?: string | null) {
      uuid(userId, 'userId');
      const subscription = validatePushSubscription(rawInput);
      await database().execute(sql`
        INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth, user_agent)
        VALUES (${userId}, ${subscription.endpoint}, ${subscription.keys.p256dh},
                ${subscription.keys.auth}, ${userAgent?.slice(0, 300) ?? null})
        ON CONFLICT (endpoint) DO UPDATE
          SET user_id = EXCLUDED.user_id, p256dh = EXCLUDED.p256dh,
              auth = EXCLUDED.auth, user_agent = EXCLUDED.user_agent
      `);
    },

    async removeSubscription(userId: string, endpoint: unknown) {
      uuid(userId, 'userId');
      if (typeof endpoint !== 'string' || !endpoint)
        throw new ServerError(400, 'Geçersiz abonelik.');
      await database().execute(sql`
        DELETE FROM push_subscriptions WHERE user_id = ${userId} AND endpoint = ${endpoint}
      `);
    },

    /**
     * Alerts the passenger has not seen on a lock screen: the dispatch had no
     * push delivery (no subscription, permission refused, or provider not
     * configured), is still unacknowledged and still about the current road.
     */
    async pendingInAppBanners(userId: string): Promise<InAppAlightingBanner[]> {
      uuid(userId, 'userId');
      const since = new Date(Date.now() - IN_APP_BANNER_WINDOW_MS);
      const result = await database().execute<{
        id: string;
        ticket_id: string;
        trip_id: string;
        threshold_km: number;
        remaining_m: number;
        seat_no: string;
        stop_name: string;
      }>(sql`
        SELECT d.id, d.ticket_id, d.trip_id, d.threshold_km, d.remaining_m,
               ts.seat_no, l.name AS stop_name
        FROM alighting_notification_dispatches d
        JOIN tickets t ON t.id = d.ticket_id
        JOIN trip_seats ts ON ts.id = t.trip_seat_id
        JOIN orders o ON o.id = t.order_id
        JOIN trips tr ON tr.id = t.trip_id
        JOIN routes r ON r.id = tr.route_id
        JOIN locations l ON l.id = COALESCE(o.alighting_location_id, r.destination_id)
        WHERE t.user_id = ${userId}
          AND d.status = 'sent'
          AND d.push_sent_at IS NULL
          AND d.acked_at IS NULL
          AND d.created_at > ${since}
        ORDER BY d.created_at ASC
      `);
      return result.rows.map((row) => {
        const threshold = row.threshold_km as AlightingThreshold;
        return {
          id: row.id,
          ticketId: row.ticket_id,
          tripId: row.trip_id,
          threshold,
          ...buildAlightingMessage({
            threshold,
            stopName: row.stop_name,
            seatNo: row.seat_no,
            minutes: estimateMinutes(row.remaining_m / 1000, 0),
            ticketId: row.ticket_id,
          }),
        };
      });
    },

    async acknowledge(userId: string, ids: unknown) {
      uuid(userId, 'userId');
      if (!Array.isArray(ids) || ids.length > 20) throw new ServerError(400, 'Geçersiz istek.');
      const valid = ids.map((id) => uuid(String(id), 'id'));
      if (!valid.length) return;
      await database().execute(sql`
        UPDATE alighting_notification_dispatches d SET acked_at = now()
        FROM tickets t
        WHERE d.ticket_id = t.id AND t.user_id = ${userId}
          AND d.acked_at IS NULL
          AND d.id IN (${sql.join(
            valid.map((id) => sql`${id}::uuid`),
            sql`, `,
          )})
      `);
    },
  };
}

export const notificationService = createNotificationService();
