import * as dotenv from 'dotenv';
import { join } from 'path';
import { Pool } from 'pg';
import { DEMO_CREDENTIALS, DEMO_IDS } from '../demo-constants.js';

dotenv.config({ path: join(process.cwd(), '../../.env') });

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error('DATABASE_URL is not set');
  const pool = new Pool({ connectionString });
  try {
    const checks = await pool.query<{
      passenger_count: string;
      admin_count: string;
      future_trip_count: string;
      seat_count: string;
      route_geometry_count: string;
      active_ticket_count: string;
      secure_qr_count: string;
      live_trip_count: string;
    }>(
      `SELECT
         (SELECT count(*) FROM users WHERE id = $1 AND email = $2 AND role = 'passenger')::text AS passenger_count,
         (SELECT count(*) FROM users WHERE id = $3 AND email = $4 AND role = 'admin')::text AS admin_count,
         (SELECT count(*) FROM trips WHERE departure_time > now() AND status = 'scheduled')::text AS future_trip_count,
         (SELECT count(*) FROM trip_seats WHERE trip_id IN ($5, $6, $7, $8))::text AS seat_count,
         (SELECT count(*) FROM routes WHERE id = $9 AND ST_GeometryType(geometry) = 'ST_LineString')::text AS route_geometry_count,
         (SELECT count(*) FROM tickets WHERE id = $10 AND user_id = $1 AND status = 'active')::text AS active_ticket_count,
         (SELECT count(*) FROM tickets WHERE id = $10 AND qr_token_hash ~ '^[0-9a-f]{64}$')::text AS secure_qr_count,
         (SELECT count(*) FROM trips WHERE id = $8 AND status = 'in_transit')::text AS live_trip_count`,
      [
        DEMO_IDS.passenger,
        DEMO_CREDENTIALS.passenger.email,
        DEMO_IDS.admin,
        DEMO_CREDENTIALS.admin.email,
        DEMO_IDS.morningTrip,
        DEMO_IDS.afternoonTrip,
        DEMO_IDS.followingTrip,
        DEMO_IDS.liveTrip,
        DEMO_IDS.route,
        DEMO_IDS.activeTicket,
      ],
    );
    const result = checks.rows[0];
    const valid =
      result?.passenger_count === '1' &&
      result.admin_count === '1' &&
      Number(result.future_trip_count) >= 3 &&
      result.seat_count === '156' &&
      result.route_geometry_count === '1' &&
      result.active_ticket_count === '1' &&
      result.secure_qr_count === '1' &&
      result.live_trip_count === '1';
    if (!valid) throw new Error(`Demo verification failed: ${JSON.stringify(result)}`);
    console.log(
      'Demo verification passed: accounts, future trips, seats, route geometry, ticket, and live trip.',
    );
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
