import { describe, it, expect } from 'vitest';
import { validateConfig } from '../src/config.js';
import { createDatabaseClient } from '../src/client.js';

describe('Database Configuration', () => {
  it('should fail validation if URL is missing', () => {
    const originalUrl = process.env.DATABASE_URL;
    delete process.env.DATABASE_URL;

    expect(() => validateConfig()).toThrow('DATABASE_URL is missing');

    process.env.DATABASE_URL = originalUrl;
  });

  it('should pass validation if URL is provided in config', () => {
    const config = validateConfig({ url: 'postgres://fake:fake@127.0.0.1:5432/fake' });
    expect(config.url).toBe('postgres://fake:fake@127.0.0.1:5432/fake');
  });

  it('should not connect during module import or client creation', () => {
    // Simply creating the client should not throw connection errors
    const client = createDatabaseClient({ url: 'postgres://fake:fake@127.0.0.1:5432/fake' });
    expect(client).toBeDefined();
    expect(client.db).toBeDefined();
    // Clean up
    client.pool.end();
  });
});
