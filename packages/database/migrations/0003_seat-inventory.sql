CREATE TABLE "seat_holds" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"trip_seat_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"session_id" text,
	"status" text DEFAULT 'active' NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"released_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "trip_seats" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"trip_id" uuid NOT NULL,
	"seat_no" text NOT NULL,
	"seat_type" text DEFAULT 'standard' NOT NULL,
	"price_minor" integer NOT NULL,
	"status" text DEFAULT 'available' NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "seat_holds" ADD CONSTRAINT "seat_holds_trip_seat_id_trip_seats_id_fk" FOREIGN KEY ("trip_seat_id") REFERENCES "public"."trip_seats"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trip_seats" ADD CONSTRAINT "trip_seats_trip_id_trips_id_fk" FOREIGN KEY ("trip_id") REFERENCES "public"."trips"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "trip_seat_unique_idx" ON "trip_seats" USING btree ("trip_id","seat_no");