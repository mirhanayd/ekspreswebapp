import { relations } from 'drizzle-orm';
import {
  doublePrecision,
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { buses, trips } from './transport';

export const trackingPositions = pgTable(
  'tracking_positions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tripId: uuid('trip_id')
      .references(() => trips.id, { onDelete: 'cascade' })
      .notNull(),
    busId: uuid('bus_id')
      .references(() => buses.id, { onDelete: 'restrict' })
      .notNull(),
    longitude: doublePrecision('longitude').notNull(),
    latitude: doublePrecision('latitude').notNull(),
    speedKph: doublePrecision('speed_kph').notNull(),
    headingDeg: doublePrecision('heading_deg').notNull(),
    recordedAt: timestamp('recorded_at').notNull(),
    sequence: integer('sequence').notNull(),
    source: text('source').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    tripSequenceUnique: uniqueIndex('tracking_positions_trip_sequence_unique_idx').on(
      table.tripId,
      table.sequence,
    ),
    tripRecordedAtUnique: uniqueIndex('tracking_positions_trip_recorded_at_unique_idx').on(
      table.tripId,
      table.recordedAt,
    ),
  }),
);

export const trackingPositionsRelations = relations(trackingPositions, ({ one }) => ({
  trip: one(trips, { fields: [trackingPositions.tripId], references: [trips.id] }),
  bus: one(buses, { fields: [trackingPositions.busId], references: [buses.id] }),
}));
