import { createDatabaseClient } from '../client.js';

let client: ReturnType<typeof createDatabaseClient> | undefined;

/** Lazy, shared pool per Node process; no connection is opened during build. */
export function serverDatabase() {
  client ??= createDatabaseClient();
  return client.db;
}
