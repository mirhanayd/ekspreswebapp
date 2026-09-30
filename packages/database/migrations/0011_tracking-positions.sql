CREATE TABLE IF NOT EXISTS "tracking_positions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "trip_id" uuid NOT NULL,
  "bus_id" uuid NOT NULL,
  "longitude" double precision NOT NULL,
  "latitude" double precision NOT NULL,
  "speed_kph" double precision NOT NULL,
  "heading_deg" double precision NOT NULL,
  "recorded_at" timestamp NOT NULL,
  "sequence" integer NOT NULL,
  "source" text NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "tracking_positions_trip_id_trips_id_fk"
    FOREIGN KEY ("trip_id") REFERENCES "public"."trips"("id") ON DELETE cascade,
  CONSTRAINT "tracking_positions_bus_id_buses_id_fk"
    FOREIGN KEY ("bus_id") REFERENCES "public"."buses"("id") ON DELETE restrict
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "tracking_positions_trip_sequence_unique_idx"
  ON "tracking_positions" USING btree ("trip_id", "sequence");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "tracking_positions_trip_recorded_at_unique_idx"
  ON "tracking_positions" USING btree ("trip_id", "recorded_at");
--> statement-breakpoint
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tracking_positions_coordinates_check') THEN
    ALTER TABLE "tracking_positions"
      ADD CONSTRAINT "tracking_positions_coordinates_check"
      CHECK ("longitude" BETWEEN -180 AND 180 AND "latitude" BETWEEN -90 AND 90);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tracking_positions_motion_check') THEN
    ALTER TABLE "tracking_positions"
      ADD CONSTRAINT "tracking_positions_motion_check"
      CHECK ("speed_kph" BETWEEN 0 AND 180 AND "heading_deg" BETWEEN 0 AND 360);
  END IF;
END $$;
