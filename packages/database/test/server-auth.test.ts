import { createHmac } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { signAccessToken, verifyAccessToken } from '../src/server/auth.js';

const testSecret = 'unit-test-only-signing-key';
const principal = {
  id: '11111111-1111-4111-8111-111111111111',
  email: 'test@example.test',
  role: 'driver',
};

function signed(payload: unknown, header: unknown = { alg: 'HS256', typ: 'JWT' }) {
  const input = [header, payload]
    .map((part) => Buffer.from(JSON.stringify(part)).toString('base64url'))
    .join('.');
  return `${input}.${createHmac('sha256', testSecret).update(input).digest('base64url')}`;
}

describe('shared access tokens', () => {
  beforeEach(() => {
    vi.stubEnv('JWT_SECRET', testSecret);
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-21T12:00:00Z'));
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.useRealTimers();
  });

  it('preserves driver and legacy JWT principal/24-hour expiry contract', () => {
    const token = signAccessToken(principal);
    const result = verifyAccessToken(token)!;
    expect(result).toMatchObject({ sub: principal.id, email: principal.email, role: 'driver' });
    expect(result.exp - result.iat).toBe(86400);
    expect(verifyAccessToken(signed(result))).toEqual(result);
  });

  it('rejects expiration at the exact boundary and after', () => {
    const token = signAccessToken(principal);
    vi.advanceTimersByTime(86400 * 1000);
    expect(verifyAccessToken(token)).toBeNull();
  });

  it('rejects tampering, wrong signing key and extra token segments', () => {
    const token = signAccessToken(principal);
    expect(verifyAccessToken(`${token}.extra`)).toBeNull();
    expect(verifyAccessToken(`x${token}`)).toBeNull();
    vi.stubEnv('JWT_SECRET', 'different-unit-test-key');
    expect(verifyAccessToken(token)).toBeNull();
  });

  it.each([
    { alg: 'none', typ: 'JWT' },
    { alg: 'HS512', typ: 'JWT' },
    { alg: 'HS256', typ: 'JWT', crit: ['custom'] },
  ])('rejects unsupported headers even with a valid MAC: %j', (header) => {
    const claims = verifyAccessToken(signAccessToken(principal));
    expect(verifyAccessToken(signed(claims, header))).toBeNull();
  });

  it.each([
    null,
    {},
    { sub: 'invalid' },
    { role: 'owner' },
    { exp: '9999999999' },
    { exp: null },
    { nbf: 9999999999 },
    { iat: 9999999999 },
  ])('rejects invalid claims: %j', (change) => {
    const valid = verifyAccessToken(signAccessToken(principal));
    const value = change && Object.keys(change).length ? { ...valid, ...change } : change;
    expect(verifyAccessToken(signed(value))).toBeNull();
  });

  it('fails closed when signing configuration is missing', () => {
    vi.stubEnv('JWT_SECRET', '');
    expect(() => signAccessToken(principal)).toThrow('JWT_SECRET');
  });
});
