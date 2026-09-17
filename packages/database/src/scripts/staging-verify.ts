import * as dotenv from 'dotenv';
import { join } from 'path';
import { Pool } from 'pg';
import { DEMO_CREDENTIALS, DEMO_IDS } from '../demo-constants.js';
import { assertSafeStagingDatabase } from './staging-seed-safety.js';

dotenv.config({ path: join(process.cwd(), '../../.env') });

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error('DATABASE_URL is not set');
  assertSafeStagingDatabase(connectionString, process.env.STAGING_SEED_CONFIRM);

  const pool = new Pool({ connectionString, max: 1 });
  try {
    const checks = await pool.query<{
      passenger_count: string;
      admin_count: string;
      driver_count: string;
      future_trip_count: string;
      seat_count: string;
      route_geometry_count: string;
      active_ticket_count: string;
      driver_assignment_count: string;
      live_trip_count: string;
      tracking_history_count: string;
    }>(
      `SELECT
         (SELECT count(*) FROM users WHERE email = $1 AND role = 'passenger')::text AS passenger_count,
         (SELECT count(*) FROM users WHERE email = $2 AND role = 'admin')::text AS admin_count,
         (SELECT count(*) FROM users WHERE email = $3 AND role = 'driver')::text AS driver_count,
         (SELECT count(*) FROM trips WHERE id IN ($4, $5, $6) AND departure_time > now() AND status = 'scheduled')::text AS future_trip_count,
         (SELECT count(*) FROM trip_seats WHERE trip_id IN ($4, $5, $6, $7))::text AS seat_count,
         (SELECT count(*) FROM routes WHERE id = $8 AND ST_GeometryType(geometry) = 'ST_LineString')::text AS route_geometry_count,
         (SELECT count(*) FROM tickets t JOIN users u ON u.id = t.user_id
            WHERE t.id = $9 AND u.email = $1 AND t.status = 'active')::text AS active_ticket_count,
         (SELECT count(*) FROM trip_drivers td JOIN users u ON u.id = td.driver_id
            WHERE td.trip_id IN ($4, $5, $6, $7) AND u.email = $3)::text AS driver_assignment_count,
         (SELECT count(*) FROM trips WHERE id = $7 AND status = 'in_transit')::text AS live_trip_count,
         (SELECT count(*) FROM tracking_positions
            WHERE trip_id = $7 AND source = 'MOBILE_APP')::text AS tracking_history_count`,
      [
        DEMO_CREDENTIALS.passenger.email,
        DEMO_CREDENTIALS.admin.email,
        DEMO_CREDENTIALS.driver.email,
        DEMO_IDS.morningTrip,
        DEMO_IDS.afternoonTrip,
        DEMO_IDS.followingTrip,
        DEMO_IDS.liveTrip,
        DEMO_IDS.route,
        DEMO_IDS.activeTicket,
      ],
    );
    const result = checks.rows[0];
    const requireTrackingHistory = process.argv.includes('--require-tracking');
    const valid =
      result?.passenger_count === '1' &&
      result.admin_count === '1' &&
      result.driver_count === '1' &&
      result.future_trip_count === '3' &&
      result.seat_count === '156' &&
      result.route_geometry_count === '1' &&
      result.active_ticket_count === '1' &&
      result.driver_assignment_count === '4' &&
      result.live_trip_count === '1' &&
      (!requireTrackingHistory || Number(result.tracking_history_count) >= 1);
    if (!valid) throw new Error(`Staging fixture verification failed: ${JSON.stringify(result)}`);
    console.log(
      `Staging fixture verified: accounts, trips, seats, PostGIS route, ticket, driver assignments${
        requireTrackingHistory ? ' and GPS history' : ''
      }.`,
    );
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
