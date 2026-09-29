import { index, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { trips } from './transport';
import { users } from './users';

export const driverAdminAudit = pgTable(
  'driver_admin_audit',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    adminId: uuid('admin_id')
      .notNull()
      .references(() => users.id),
    driverId: uuid('driver_id').references(() => users.id),
    tripId: uuid('trip_id').references(() => trips.id),
    previousDriverId: uuid('previous_driver_id').references(() => users.id),
    action: text('action').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    tripCreated: index('driver_admin_audit_trip_created_idx').on(table.tripId, table.createdAt),
  }),
);
