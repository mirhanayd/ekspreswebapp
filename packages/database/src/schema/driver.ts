import { relations } from 'drizzle-orm';
import { pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { tickets } from './checkout';
import { trips } from './transport';
import { users } from './users';

export const tripDrivers = pgTable(
  'trip_drivers',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tripId: uuid('trip_id')
      .references(() => trips.id, { onDelete: 'cascade' })
      .notNull(),
    driverId: uuid('driver_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    assignedAt: timestamp('assigned_at').defaultNow().notNull(),
  },
  (table) => ({
    oneDriverPerTrip: uniqueIndex('trip_drivers_trip_unique_idx').on(table.tripId),
  }),
);

export const passengerBoarding = pgTable(
  'passenger_boarding',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    ticketId: uuid('ticket_id')
      .references(() => tickets.id, { onDelete: 'cascade' })
      .notNull(),
    status: text('status').notNull().default('pending'),
    updatedBy: uuid('updated_by').references(() => users.id, { onDelete: 'set null' }),
    boardedAt: timestamp('boarded_at'),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    oneBoardingStatePerTicket: uniqueIndex('passenger_boarding_ticket_unique_idx').on(
      table.ticketId,
    ),
  }),
);

export const tripDriversRelations = relations(tripDrivers, ({ one }) => ({
  trip: one(trips, { fields: [tripDrivers.tripId], references: [trips.id] }),
  driver: one(users, { fields: [tripDrivers.driverId], references: [users.id] }),
}));

export const passengerBoardingRelations = relations(passengerBoarding, ({ one }) => ({
  ticket: one(tickets, { fields: [passengerBoarding.ticketId], references: [tickets.id] }),
  updater: one(users, { fields: [passengerBoarding.updatedBy], references: [users.id] }),
}));
