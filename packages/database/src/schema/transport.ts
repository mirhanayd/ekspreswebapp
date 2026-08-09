import { pgTable, text, timestamp, uuid, doublePrecision, integer, jsonb } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

// We define PostGIS geometry as a custom type since drizzle support for postgis can be limited.
// Or we can just use geometry from pg-core if it exists, but in drizzle 0.30+ it does!
import { customType } from 'drizzle-orm/pg-core';

export const geometryType = customType<{ data: { type: string, coordinates: number[] }, driverData: string }>({
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
  originId: uuid('origin_id').references(() => locations.id).notNull(),
  destinationId: uuid('destination_id').references(() => locations.id).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const routeStops = pgTable('route_stops', {
  id: uuid('id').defaultRandom().primaryKey(),
  routeId: uuid('route_id').references(() => routes.id).notNull(),
  locationId: uuid('location_id').references(() => locations.id).notNull(),
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
  routeId: uuid('route_id').references(() => routes.id).notNull(),
  busId: uuid('bus_id').references(() => buses.id).notNull(),
  departureTime: timestamp('departure_time').notNull(),
  arrivalTime: timestamp('arrival_time').notNull(),
  status: text('status').notNull().default('scheduled'), // scheduled, boarding, in_transit, completed, cancelled
  basePrice: doublePrecision('base_price').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
