import * as dotenv from 'dotenv';
import { join } from 'path';
import { createDatabaseClient } from '../client.js';

// Load .env from the repository root if available
dotenv.config({ path: join(__dirname, '../../../.env') });

async function verify() {
  console.log('Starting database verification...');

  if (!process.env.DATABASE_URL) {
    console.error('Error: DATABASE_URL is missing in environment variables.');
    process.exit(1);
  }

  const { db, pool, close } = createDatabaseClient();

  try {
    // 1. Check basic connectivity
    console.log('Checking PostgreSQL connectivity...');
    const versionRes = await pool.query('SELECT version();');
    console.log('✅ Connected. Version:', versionRes.rows[0].version);

    // 2. Check current database name safely
    const dbNameRes = await pool.query('SELECT current_database();');
    console.log('✅ Database name:', dbNameRes.rows[0].current_database);

    // 3. Check timezone
    const tzRes = await pool.query('SHOW TIMEZONE;');
    console.log('✅ Timezone:', tzRes.rows[0].TimeZone);

    // 4. Check PostGIS extension
    console.log('Checking PostGIS availability...');
    try {
      const postgisRes = await pool.query('SELECT PostGIS_Version();');
      console.log('✅ PostGIS is available. Version:', postgisRes.rows[0].postgis_version);
    } catch (e: any) {
      console.error('❌ PostGIS verification failed. Is the extension installed?');
      throw e;
    }

    console.log('🎉 All database verification checks passed.');
  } catch (error) {
    console.error('❌ Database verification failed.');
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  } finally {
    await close();
  }
}

verify().catch((err) => {
  console.error('Unhandled verification error:', err);
  process.exit(1);
});
