ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "is_active" boolean NOT NULL DEFAULT true;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "users_driver_active_idx"
  ON "users" USING btree ("role", "is_active");
