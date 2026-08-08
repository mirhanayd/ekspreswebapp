import { describe, it, expect, beforeAll, afterAll } from 'vitest';
// Load .env from the repository root if available
import { createDatabaseClient } from '../src/client.js';
import * as dotenv from 'dotenv';
import { join } from 'path';
dotenv.config({ path: join(process.cwd(), "../../.env") });

describe('Database Integration Smoke Tests', () => {
  let client: ReturnType<typeof createDatabaseClient>;

  beforeAll(() => {
    const url = process.env.DATABASE_URL;
    if (!url) {
      throw new Error('Integration tests require DATABASE_URL in the environment.');
    }

    if (url.includes('production')) {
      throw new Error('SAFETY GUARD: Suspicious production database URL detected.');
    }

    client = createDatabaseClient({ url });
  });

  afterAll(async () => {
    if (client) {
      await client.close();
    }
  });

  it('should connect to PostgreSQL successfully', async () => {
    const res = await client.pool.query('SELECT 1 as val;');
    expect(res.rows[0].val).toBe(1);
  });

  it('should have PostGIS extension available', async () => {
    const res = await client.pool.query('SELECT PostGIS_Version();');
    expect(res.rows[0].postgis_version).toBeDefined();
    expect(typeof res.rows[0].postgis_version).toBe('string');
  });
});
