import { index, jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
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

export const adminAuditLog = pgTable(
  'admin_audit_log',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    actorId: uuid('actor_id')
      .notNull()
      .references(() => users.id),
    action: text('action').notNull(),
    entity: text('entity').notNull(),
    entityId: uuid('entity_id').notNull(),
    before: jsonb('before').$type<Record<string, string | null> | null>(),
    after: jsonb('after').$type<Record<string, string | null> | null>(),
    reason: text('reason'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    entityCreated: index('admin_audit_log_entity_created_idx').on(
      table.entity,
      table.entityId,
      table.createdAt,
    ),
  }),
);
