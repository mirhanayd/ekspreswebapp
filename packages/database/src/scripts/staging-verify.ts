import * as dotenv from 'dotenv';
import { join } from 'path';
import { Pool } from 'pg';
import { STAGING_IDS } from '../staging-fixture-ids.js';

dotenv.config({ path: join(process.cwd(), '../../.env') });

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error('DATABASE_URL is not set');
  const url = new URL(connectionString);
  if (decodeURIComponent(url.pathname.slice(1)) !== 'ekspres_staging') {
    throw new Error('SAFETY GUARD: verification requires ekspres_staging.');
  }

  const pool = new Pool({ connectionString });
  try {
    const result = await pool.query<{
      database_name: string;
      active_trip_count: string;
      future_trip_count: string;
      seat_count: string;
      assignment_count: string;
      manifest_count: string;
      stop_count: string;
      boarding_state_count: string;
    }>(
      `SELECT current_database() AS database_name,
        (SELECT count(*) FROM trips WHERE id = $1 AND status IN ('boarding', 'in_transit')
           AND departure_time > now() - interval '2 hours' AND arrival_time > now())::text AS active_trip_count,
        (SELECT count(*) FROM trips WHERE id = ANY($2::uuid[]) AND status = 'scheduled'
           AND departure_time > now())::text AS future_trip_count,
        (SELECT count(*) FROM trip_seats WHERE trip_id = ANY($3::uuid[]))::text AS seat_count,
        (SELECT count(*) FROM trip_drivers WHERE trip_id = ANY($3::uuid[]) AND driver_id = $4)::text AS assignment_count,
        (SELECT count(*) FROM tickets WHERE trip_id = $1 AND status = 'active')::text AS manifest_count,
        (SELECT count(*) FROM route_stops WHERE route_id = $5)::text AS stop_count,
        (SELECT count(DISTINCT pb.status) FROM passenger_boarding pb
           JOIN tickets t ON t.id = pb.ticket_id WHERE t.trip_id = $1)::text AS boarding_state_count`,
      [
        STAGING_IDS.liveTrip,
        [STAGING_IDS.morningTrip, STAGING_IDS.afternoonTrip, STAGING_IDS.followingTrip],
        [
          STAGING_IDS.liveTrip,
          STAGING_IDS.morningTrip,
          STAGING_IDS.afternoonTrip,
          STAGING_IDS.followingTrip,
        ],
        (
          await pool.query<{ id: string }>(
            "SELECT id FROM users WHERE email = 'sofor@siirtkurtalan.demo' AND role = 'driver'",
          )
        ).rows[0]?.id,
        STAGING_IDS.route,
      ],
    );
    const row = result.rows[0];
    if (
      row?.database_name !== 'ekspres_staging' ||
      row.active_trip_count !== '1' ||
      row.future_trip_count !== '3' ||
      row.seat_count !== '156' ||
      row.assignment_count !== '4' ||
      Number(row.manifest_count) < 3 ||
      row.stop_count !== '4' ||
      row.boarding_state_count !== '3'
    ) {
      throw new Error(`Staging fixture verification failed: ${JSON.stringify(row)}`);
    }
    console.log(
      'Staging fixture verified: live and future trips, seats, assignments, manifest, boarding states and stops.',
    );
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
