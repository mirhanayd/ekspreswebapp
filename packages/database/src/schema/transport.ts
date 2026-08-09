import {
  pgTable,
  text,
  timestamp,
  uuid,
  doublePrecision,
  integer,
  jsonb,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { sql, relations } from 'drizzle-orm';

// We define PostGIS geometry as a custom type since drizzle support for postgis can be limited.
// Or we can just use geometry from pg-core if it exists, but in drizzle 0.30+ it does!
import { customType } from 'drizzle-orm/pg-core';

export const geometryType = customType<{
  data: { type: string; coordinates: number[] };
  driverData: string;
}>({
  dataType() {
    return 'geometry(Point, 4326)';
  },
  toDriver(value) {
    // ST_GeomFromGeoJSON or ST_SetSRID(ST_MakePoint(lon, lat), 4326)
    return `SRID=4326;POINT(${value.coordinates[0]} ${value.coordinates[1]})`;
  },
});

export const locations = pgTable('locations', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  type: text('type').notNull(), // 'city', 'terminal', 'stop'
  coordinates: geometryType('coordinates'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const routes = pgTable('routes', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  originId: uuid('origin_id')
    .references(() => locations.id)
    .notNull(),
  destinationId: uuid('destination_id')
    .references(() => locations.id)
    .notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const routeStops = pgTable('route_stops', {
  id: uuid('id').defaultRandom().primaryKey(),
  routeId: uuid('route_id')
    .references(() => routes.id)
    .notNull(),
  locationId: uuid('location_id')
    .references(() => locations.id)
    .notNull(),
  stopOrder: integer('stop_order').notNull(),
  estimatedMinutesFromStart: integer('estimated_minutes_from_start').notNull(),
});

export const buses = pgTable('buses', {
  id: uuid('id').defaultRandom().primaryKey(),
  plateNumber: text('plate_number').notNull().unique(),
  model: text('model'),
  seatLayout: jsonb('seat_layout').notNull(), // 2+1, 2+2, etc. definition
  totalSeats: integer('total_seats').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const trips = pgTable('trips', {
  id: uuid('id').defaultRandom().primaryKey(),
  routeId: uuid('route_id')
    .references(() => routes.id)
    .notNull(),
  busId: uuid('bus_id')
    .references(() => buses.id)
    .notNull(),
  departureTime: timestamp('departure_time').notNull(),
  arrivalTime: timestamp('arrival_time').notNull(),
  status: text('status').notNull().default('scheduled'), // scheduled, boarding, in_transit, completed, cancelled
  basePrice: doublePrecision('base_price').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const locationsRelations = relations(locations, ({ many }) => ({
  routesAsOrigin: many(routes, { relationName: 'originLocation' }),
  routesAsDestination: many(routes, { relationName: 'destinationLocation' }),
  routeStops: many(routeStops),
}));

export const routesRelations = relations(routes, ({ one, many }) => ({
  origin: one(locations, {
    fields: [routes.originId],
    references: [locations.id],
    relationName: 'originLocation',
  }),
  destination: one(locations, {
    fields: [routes.destinationId],
    references: [locations.id],
    relationName: 'destinationLocation',
  }),
  stops: many(routeStops),
  trips: many(trips),
}));

export const routeStopsRelations = relations(routeStops, ({ one }) => ({
  route: one(routes, {
    fields: [routeStops.routeId],
    references: [routes.id],
  }),
  location: one(locations, {
    fields: [routeStops.locationId],
    references: [locations.id],
  }),
}));

export const busesRelations = relations(buses, ({ many }) => ({
  trips: many(trips),
}));

export const tripsRelations = relations(trips, ({ one, many }) => ({
  route: one(routes, {
    fields: [trips.routeId],
    references: [routes.id],
  }),
  bus: one(buses, {
    fields: [trips.busId],
    references: [buses.id],
  }),
  seats: many(tripSeats),
}));

// ── Seat Inventory ──────────────────────────────────────────────

export const tripSeats = pgTable(
  'trip_seats',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tripId: uuid('trip_id')
      .references(() => trips.id)
      .notNull(),
    seatNo: text('seat_no').notNull(),
    seatType: text('seat_type').notNull().default('standard'), // standard, premium, disabled
    priceMinor: integer('price_minor').notNull(), // price in kuruş (cents)
    status: text('status').notNull().default('available'), // available, held, purchased, blocked
    version: integer('version').notNull().default(1),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    tripSeatUnique: uniqueIndex('trip_seat_unique_idx').on(table.tripId, table.seatNo),
  }),
);

export const tripSeatsRelations = relations(tripSeats, ({ one, many }) => ({
  trip: one(trips, {
    fields: [tripSeats.tripId],
    references: [trips.id],
  }),
  holds: many(seatHolds),
}));

export const seatHolds = pgTable('seat_holds', {
  id: uuid('id').defaultRandom().primaryKey(),
  tripSeatId: uuid('trip_seat_id')
    .references(() => tripSeats.id)
    .notNull(),
  userId: uuid('user_id').notNull(),
  sessionId: text('session_id'),
  status: text('status').notNull().default('active'), // active, released, expired, consumed
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  releasedAt: timestamp('released_at'),
});

export const seatHoldsRelations = relations(seatHolds, ({ one }) => ({
  tripSeat: one(tripSeats, {
    fields: [seatHolds.tripSeatId],
    references: [tripSeats.id],
  }),
}));
