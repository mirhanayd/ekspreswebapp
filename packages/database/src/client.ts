import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema/index.js';
import { DatabaseConfig, validateConfig } from './config.js';

export function createDatabaseClient(config?: Partial<DatabaseConfig>) {
  const validConfig = validateConfig(config);

  const pool = new Pool({
    connectionString: validConfig.url,
  });

  const db = drizzle(pool, { schema });

  return {
    db,
    pool,
    async close() {
      await pool.end();
    },
  };
}
