WITH ranked_active_holds AS (
  SELECT
    id,
    row_number() OVER (
      PARTITION BY trip_seat_id
      ORDER BY created_at DESC, id DESC
    ) AS hold_rank
  FROM seat_holds
  WHERE status = 'active'
)
UPDATE seat_holds
SET status = 'released', released_at = COALESCE(released_at, now())
FROM ranked_active_holds
WHERE seat_holds.id = ranked_active_holds.id AND ranked_active_holds.hold_rank > 1;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "seat_holds_one_active_per_seat_idx"
  ON "seat_holds" USING btree ("trip_seat_id")
  WHERE "seat_holds"."status" = 'active';
