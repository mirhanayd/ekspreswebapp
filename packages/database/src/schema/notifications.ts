import { relations } from 'drizzle-orm';
import {
  boolean,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { tickets } from './checkout';
import { trips } from './transport';
import { users } from './users';

/** One row per ticket and threshold: the dispatch log is what makes each alert fire once. */
export const alightingNotificationDispatches = pgTable(
  'alighting_notification_dispatches',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    ticketId: uuid('ticket_id')
      .references(() => tickets.id, { onDelete: 'cascade' })
      .notNull(),
    tripId: uuid('trip_id')
      .references(() => trips.id, { onDelete: 'cascade' })
      .notNull(),
    thresholdKm: integer('threshold_km').notNull(),
    remainingM: integer('remaining_m').notNull(),
    status: text('status').notNull(), // sent, superseded, disabled
    pushSentAt: timestamp('push_sent_at', { withTimezone: true }),
    ackedAt: timestamp('acked_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    oncePerTicketThreshold: uniqueIndex('alighting_dispatch_ticket_threshold_idx').on(
      table.ticketId,
      table.thresholdKm,
    ),
    byTrip: index('alighting_dispatch_trip_idx').on(table.tripId),
  }),
);

export const pushSubscriptions = pgTable(
  'push_subscriptions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    endpoint: text('endpoint').notNull(),
    p256dh: text('p256dh').notNull(),
    auth: text('auth').notNull(),
    userAgent: text('user_agent'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    uniqueEndpoint: uniqueIndex('push_subscriptions_endpoint_idx').on(table.endpoint),
    byUser: index('push_subscriptions_user_idx').on(table.userId),
  }),
);

export const notificationPreferences = pgTable('notification_preferences', {
  userId: uuid('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .primaryKey(),
  km5: boolean('km5').default(true).notNull(),
  km1: boolean('km1').default(true).notNull(),
  sound: boolean('sound').default(true).notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const alightingNotificationDispatchesRelations = relations(
  alightingNotificationDispatches,
  ({ one }) => ({
    ticket: one(tickets, {
      fields: [alightingNotificationDispatches.ticketId],
      references: [tickets.id],
    }),
  }),
);
