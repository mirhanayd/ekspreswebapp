import { relations } from 'drizzle-orm';
import {
  doublePrecision,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { buses, geometryType, trips } from './transport';

export const trackingPositions = pgTable(
  'tracking_positions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tripId: uuid('trip_id')
      .references(() => trips.id, { onDelete: 'cascade' })
      .notNull(),
    busId: uuid('bus_id')
      .references(() => buses.id, { onDelete: 'cascade' })
      .notNull(),
    position: geometryType('position').notNull(),
    speedKph: doublePrecision('speed_kph').notNull(),
    headingDeg: doublePrecision('heading_deg').notNull(),
    recordedAt: timestamp('recorded_at', { withTimezone: true }).notNull(),
    sequence: integer('sequence').notNull(),
    source: text('source').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    uniqueTripSequence: uniqueIndex('tracking_positions_trip_sequence_unique_idx').on(
      table.tripId,
      table.sequence,
    ),
    byTripRecordedAt: index('tracking_positions_trip_recorded_at_idx').on(
      table.tripId,
      table.recordedAt,
    ),
    positionGist: index('tracking_positions_position_gist_idx').using('gist', table.position),
  }),
);

export const trackingPositionsRelations = relations(trackingPositions, ({ one }) => ({
  trip: one(trips, { fields: [trackingPositions.tripId], references: [trips.id] }),
  bus: one(buses, { fields: [trackingPositions.busId], references: [buses.id] }),
}));
