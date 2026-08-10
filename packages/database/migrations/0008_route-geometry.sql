ALTER TABLE "routes" ADD COLUMN IF NOT EXISTS "geometry" geometry(LineString, 4326);
