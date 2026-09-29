ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "is_active" boolean DEFAULT true NOT NULL;
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "session_version" integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "driver_admin_audit" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "admin_id" uuid NOT NULL REFERENCES "users"("id"),
  "driver_id" uuid REFERENCES "users"("id"),
  "trip_id" uuid REFERENCES "trips"("id"),
  "previous_driver_id" uuid REFERENCES "users"("id"),
  "action" text NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "driver_admin_audit_trip_created_idx" ON "driver_admin_audit" ("trip_id", "created_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "trip_drivers_driver_idx" ON "trip_drivers" ("driver_id");
