import { pgTable, text, timestamp, uuid, integer, uniqueIndex } from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';
import { users } from './users';
import { locations, trips, tripSeats } from './transport';

// ── Orders ──────────────────────────────────────────────────────

export const orders = pgTable('orders', {
  id: uuid('id').defaultRandom().primaryKey(),
  orderNo: text('order_no').notNull().unique(),
  userId: uuid('user_id')
    .references(() => users.id)
    .notNull(),
  tripId: uuid('trip_id')
    .references(() => trips.id)
    .notNull(),
  tripSeatId: uuid('trip_seat_id')
    .references(() => tripSeats.id)
    .notNull(),
  boardingLocationId: uuid('boarding_location_id').references(() => locations.id),
  alightingLocationId: uuid('alighting_location_id').references(() => locations.id),
  status: text('status').notNull().default('pending'), // pending, paid, cancelled, expired
  totalMinor: integer('total_minor').notNull(), // price in kuruş
  currency: text('currency').notNull().default('TRY'),
  idempotencyKey: text('idempotency_key').unique(),
  passengerFirstName: text('passenger_first_name').notNull(),
  passengerLastName: text('passenger_last_name').notNull(),
  passengerPhone: text('passenger_phone'),
  passengerEmail: text('passenger_email'),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const ordersRelations = relations(orders, ({ one, many }) => ({
  user: one(users, {
    fields: [orders.userId],
    references: [users.id],
  }),
  trip: one(trips, {
    fields: [orders.tripId],
    references: [trips.id],
  }),
  tripSeat: one(tripSeats, {
    fields: [orders.tripSeatId],
    references: [tripSeats.id],
  }),
  boardingLocation: one(locations, {
    fields: [orders.boardingLocationId],
    references: [locations.id],
    relationName: 'orderBoardingLocation',
  }),
  alightingLocation: one(locations, {
    fields: [orders.alightingLocationId],
    references: [locations.id],
    relationName: 'orderAlightingLocation',
  }),
  payments: many(payments),
  ticket: one(tickets),
}));

// ── Payments ────────────────────────────────────────────────────

export const payments = pgTable(
  'payments',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    orderId: uuid('order_id')
      .references(() => orders.id)
      .notNull(),
    provider: text('provider').notNull().default('demo'), // demo, iyzico, etc.
    providerPaymentId: text('provider_payment_id').unique(),
    status: text('status').notNull().default('pending'), // pending, success, failed
    amountMinor: integer('amount_minor').notNull(),
    currency: text('currency').notNull().default('TRY'),
    failureCode: text('failure_code'),
    paidAt: timestamp('paid_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    orderPaymentUnique: uniqueIndex('payments_order_unique_idx').on(table.orderId),
  }),
);

export const paymentsRelations = relations(payments, ({ one }) => ({
  order: one(orders, {
    fields: [payments.orderId],
    references: [orders.id],
  }),
}));

// ── Tickets ─────────────────────────────────────────────────────

export const tickets = pgTable(
  'tickets',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    ticketNo: text('ticket_no').notNull().unique(),
    userId: uuid('user_id')
      .references(() => users.id)
      .notNull(),
    tripId: uuid('trip_id')
      .references(() => trips.id)
      .notNull(),
    tripSeatId: uuid('trip_seat_id')
      .references(() => tripSeats.id)
      .notNull(),
    orderId: uuid('order_id')
      .references(() => orders.id)
      .notNull(),
    status: text('status').notNull().default('active'), // active, used, cancelled
    qrTokenHash: text('qr_token_hash'),
    issuedAt: timestamp('issued_at').defaultNow().notNull(),
    cancelledAt: timestamp('cancelled_at'),
  },
  (table) => ({
    orderTicketUnique: uniqueIndex('order_ticket_unique_idx').on(table.orderId),
    seatTicketUnique: uniqueIndex('seat_ticket_unique_idx')
      .on(table.tripSeatId)
      .where(sql`${table.status} != 'cancelled'`),
  }),
);

export const ticketsRelations = relations(tickets, ({ one }) => ({
  user: one(users, {
    fields: [tickets.userId],
    references: [users.id],
  }),
  trip: one(trips, {
    fields: [tickets.tripId],
    references: [trips.id],
  }),
  tripSeat: one(tripSeats, {
    fields: [tickets.tripSeatId],
    references: [tripSeats.id],
  }),
  order: one(orders, {
    fields: [tickets.orderId],
    references: [orders.id],
  }),
}));
