-- A seat may change hands at a stop, so "one live ticket per seat" becomes "no two live tickets
-- on a seat for overlapping legs". Legs are half-open route stop orders. The defaults span the
-- whole route, so existing and whole-trip tickets stay exclusive of everything else on the seat.
CREATE EXTENSION IF NOT EXISTS btree_gist;
--> statement-breakpoint
ALTER TABLE "tickets" ADD COLUMN IF NOT EXISTS "leg_from" integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE "tickets" ADD COLUMN IF NOT EXISTS "leg_to" integer DEFAULT 2147483647 NOT NULL;
--> statement-breakpoint
ALTER TABLE "tickets" DROP CONSTRAINT IF EXISTS "tickets_leg_order_check";
--> statement-breakpoint
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_leg_order_check" CHECK ("leg_from" < "leg_to");
--> statement-breakpoint
ALTER TABLE "tickets" DROP CONSTRAINT IF EXISTS "tickets_seat_leg_excl";
--> statement-breakpoint
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_seat_leg_excl"
  EXCLUDE USING gist ("trip_seat_id" WITH =, int4range("leg_from", "leg_to") WITH &&)
  WHERE ("status" <> 'cancelled');
--> statement-breakpoint
DROP INDEX IF EXISTS "seat_ticket_unique_idx";
