import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { eq, inArray } from 'drizzle-orm';
import { createDatabaseClient } from '../src/client.js';
import { users } from '../src/schema/users.js';
import { createAuthService } from '../src/server/auth-service.js';
import { signAccessToken } from '../src/server/auth.js';

describe('serverless authentication against PostgreSQL', () => {
  let client: ReturnType<typeof createDatabaseClient>;
  let service: ReturnType<typeof createAuthService>;
  const createdIds: string[] = [];
  const input = () => ({
    email: `auth-${randomUUID()}@example.test`,
    password: 'integration-test-only-password',
    firstName: 'Auth',
    lastName: 'Test',
  });

  beforeAll(() => {
    const url = process.env.DATABASE_URL;
    if (!url || !['localhost', '127.0.0.1', 'postgres'].includes(new URL(url).hostname)) {
      throw new Error('Auth integration tests require an isolated local/CI PostgreSQL database.');
    }
    client = createDatabaseClient({ url });
    service = createAuthService(() => client.db);
    vi.stubEnv('JWT_SECRET', 'integration-test-only-signing-key');
  });
  afterAll(async () => {
    if (client) {
      try {
        if (createdIds.length) await client.db.delete(users).where(inArray(users.id, createdIds));
      } finally {
        await client.close();
      }
    }
    vi.unstubAllEnvs();
  });

  it('registers only a passenger, hashes credentials and returns a safe session', async () => {
    const body = input();
    const user = await service.register({ ...body, role: 'admin', id: randomUUID() });
    createdIds.push(user.id);
    expect(user.role).toBe('passenger');
    expect(user).not.toHaveProperty('passwordHash');
    const stored = await client.db.query.users.findFirst({ where: eq(users.id, user.id) });
    expect(stored!.passwordHash).not.toBe(body.password);
    const principal = await service.login(body);
    expect(principal).toEqual({ id: user.id, email: body.email, role: 'passenger' });
    const profile = await service.session(signAccessToken(principal));
    expect(profile.id).toBe(user.id);
    expect(profile).not.toHaveProperty('passwordHash');
    await expect(service.login({ ...body, password: 'incorrect' })).rejects.toMatchObject({
      status: 401,
    });
    await expect(service.login(body, 'admin')).rejects.toMatchObject({ status: 403 });
    await expect(service.login(body, 'driver')).rejects.toMatchObject({ status: 403 });
  });

  it('arbitrates simultaneous registrations with the unique email constraint', async () => {
    const body = input();
    const results = await Promise.allSettled([service.register(body), service.register(body)]);
    for (const result of results)
      if (result.status === 'fulfilled') createdIds.push(result.value.id);
    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    const rejected = results.find(
      (result) => result.status === 'rejected',
    ) as PromiseRejectedResult;
    expect(rejected.reason).toMatchObject({ status: 409 });
  });

  it('preserves driver-only login and rejects deleted/malformed sessions', async () => {
    const body = input();
    const user = await service.register(body);
    createdIds.push(user.id);
    await client.db.update(users).set({ role: 'driver' }).where(eq(users.id, user.id));
    const principal = await service.login(body, 'driver');
    expect(principal.role).toBe('driver');
    const token = signAccessToken(principal);
    await client.db.delete(users).where(eq(users.id, user.id));
    await expect(service.session(token)).rejects.toMatchObject({ status: 401 });
    await expect(service.session(undefined)).rejects.toMatchObject({ status: 401 });
    await expect(service.session('malformed')).rejects.toMatchObject({ status: 401 });
    await expect(service.login(input())).rejects.toMatchObject({ status: 401 });
  });
});
