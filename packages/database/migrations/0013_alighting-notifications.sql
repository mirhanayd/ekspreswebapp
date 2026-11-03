CREATE TABLE IF NOT EXISTS "alighting_notification_dispatches" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "ticket_id" uuid NOT NULL,
  "trip_id" uuid NOT NULL,
  "threshold_km" integer NOT NULL,
  "remaining_m" integer NOT NULL,
  "status" text NOT NULL,
  "push_sent_at" timestamp with time zone,
  "acked_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "alighting_dispatch_ticket_fk"
    FOREIGN KEY ("ticket_id") REFERENCES "public"."tickets"("id") ON DELETE cascade,
  CONSTRAINT "alighting_dispatch_trip_fk"
    FOREIGN KEY ("trip_id") REFERENCES "public"."trips"("id") ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "alighting_dispatch_ticket_threshold_idx"
  ON "alighting_notification_dispatches" USING btree ("ticket_id", "threshold_km");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "alighting_dispatch_trip_idx"
  ON "alighting_notification_dispatches" USING btree ("trip_id");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "push_subscriptions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL,
  "endpoint" text NOT NULL,
  "p256dh" text NOT NULL,
  "auth" text NOT NULL,
  "user_agent" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "push_subscriptions_user_fk"
    FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "push_subscriptions_endpoint_idx"
  ON "push_subscriptions" USING btree ("endpoint");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "push_subscriptions_user_idx"
  ON "push_subscriptions" USING btree ("user_id");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "notification_preferences" (
  "user_id" uuid PRIMARY KEY NOT NULL,
  "km5" boolean DEFAULT true NOT NULL,
  "km1" boolean DEFAULT true NOT NULL,
  "sound" boolean DEFAULT true NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "notification_preferences_user_fk"
    FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade
);
