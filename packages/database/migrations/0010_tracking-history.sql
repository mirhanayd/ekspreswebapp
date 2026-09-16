CREATE TABLE IF NOT EXISTS "tracking_positions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "trip_id" uuid NOT NULL,
  "bus_id" uuid NOT NULL,
  "position" geometry(Point, 4326) NOT NULL,
  "speed_kph" double precision NOT NULL,
  "heading_deg" double precision NOT NULL,
  "recorded_at" timestamp with time zone NOT NULL,
  "sequence" integer NOT NULL,
  "source" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "tracking_positions_trip_id_trips_id_fk"
    FOREIGN KEY ("trip_id") REFERENCES "public"."trips"("id") ON DELETE cascade,
  CONSTRAINT "tracking_positions_bus_id_buses_id_fk"
    FOREIGN KEY ("bus_id") REFERENCES "public"."buses"("id") ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "tracking_positions_trip_sequence_unique_idx"
  ON "tracking_positions" USING btree ("trip_id", "sequence");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "tracking_positions_trip_recorded_at_idx"
  ON "tracking_positions" USING btree ("trip_id", "recorded_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "tracking_positions_position_gist_idx"
  ON "tracking_positions" USING gist ("position");
