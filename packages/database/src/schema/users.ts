import { pgTable, text, timestamp, uuid, pgEnum, boolean, integer } from 'drizzle-orm/pg-core';

export const roleEnum = pgEnum('role', ['admin', 'passenger', 'driver']);

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  firstName: text('first_name').notNull(),
  lastName: text('last_name').notNull(),
  role: roleEnum('role').notNull().default('passenger'),
  isActive: boolean('is_active').notNull().default(true),
  mustChangePassword: boolean('must_change_password').notNull().default(false),
  sessionsValidAfter: timestamp('sessions_valid_after', { withTimezone: true }),
  sessionVersion: integer('session_version').notNull().default(0),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
