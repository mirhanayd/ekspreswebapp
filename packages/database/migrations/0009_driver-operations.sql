DO $$
BEGIN
  ALTER TYPE "role" ADD VALUE IF NOT EXISTS 'driver';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "boarding_location_id" uuid;
--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "alighting_location_id" uuid;
--> statement-breakpoint
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'orders_boarding_location_id_locations_id_fk') THEN
    ALTER TABLE "orders" ADD CONSTRAINT "orders_boarding_location_id_locations_id_fk"
      FOREIGN KEY ("boarding_location_id") REFERENCES "public"."locations"("id");
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'orders_alighting_location_id_locations_id_fk') THEN
    ALTER TABLE "orders" ADD CONSTRAINT "orders_alighting_location_id_locations_id_fk"
      FOREIGN KEY ("alighting_location_id") REFERENCES "public"."locations"("id");
  END IF;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "trip_drivers" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "trip_id" uuid NOT NULL,
  "driver_id" uuid NOT NULL,
  "assigned_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "trip_drivers_trip_id_trips_id_fk"
    FOREIGN KEY ("trip_id") REFERENCES "public"."trips"("id") ON DELETE cascade,
  CONSTRAINT "trip_drivers_driver_id_users_id_fk"
    FOREIGN KEY ("driver_id") REFERENCES "public"."users"("id") ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "trip_drivers_trip_unique_idx" ON "trip_drivers" USING btree ("trip_id");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "passenger_boarding" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "ticket_id" uuid NOT NULL,
  "status" text DEFAULT 'pending' NOT NULL,
  "updated_by" uuid,
  "boarded_at" timestamp,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "passenger_boarding_ticket_id_tickets_id_fk"
    FOREIGN KEY ("ticket_id") REFERENCES "public"."tickets"("id") ON DELETE cascade,
  CONSTRAINT "passenger_boarding_updated_by_users_id_fk"
    FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null,
  CONSTRAINT "passenger_boarding_status_check"
    CHECK ("status" IN ('pending', 'boarded', 'no_show'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "passenger_boarding_ticket_unique_idx" ON "passenger_boarding" USING btree ("ticket_id");
