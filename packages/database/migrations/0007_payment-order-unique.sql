DELETE FROM "payments"
WHERE "id" IN (
  SELECT "id"
  FROM (
    SELECT
      "id",
      row_number() OVER (
        PARTITION BY "order_id"
        ORDER BY ("status" = 'success') DESC, "paid_at" DESC NULLS LAST, "created_at" DESC, "id" DESC
      ) AS "row_number"
    FROM "payments"
  ) AS "ranked_payments"
  WHERE "row_number" > 1
);

CREATE UNIQUE INDEX IF NOT EXISTS "payments_order_unique_idx"
  ON "payments" USING btree ("order_id");
