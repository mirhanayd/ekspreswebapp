ALTER TABLE "passenger_boarding" DROP CONSTRAINT IF EXISTS "passenger_boarding_status_check";
--> statement-breakpoint
ALTER TABLE "passenger_boarding" ADD CONSTRAINT "passenger_boarding_status_check"
  CHECK ("status" IN ('pending', 'boarded', 'alighted', 'no_show'));
