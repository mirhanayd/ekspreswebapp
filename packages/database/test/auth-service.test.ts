import { describe, expect, it } from 'vitest';
import { validateAuthInput } from '../src/server/auth-service.js';

describe('auth input validation', () => {
  const registration = {
    email: 'test@example.test',
    password: 'test-password',
    firstName: 'Test',
    lastName: 'User',
  };
  it('strips submitted roles and identity fields', () => {
    expect(validateAuthInput({ ...registration, role: 'admin', id: 'forged' }, true)).toEqual(
      registration,
    );
  });
  it.each([
    null,
    [],
    'text',
    {},
    { email: 'bad', password: 'test-password' },
    { email: 'test@example.test', password: '' },
  ])('rejects malformed login: %j', (body) => {
    expect(() => validateAuthInput(body)).toThrow();
  });
  it('preserves legacy case-sensitive email identities', () => {
    expect(validateAuthInput({ email: 'Existing@Example.test', password: 'x' }).email).toBe(
      'Existing@Example.test',
    );
  });
  it.each([
    { password: 'short' },
    { password: 'é'.repeat(37) },
    { firstName: ' ' },
    { lastName: 'X' },
  ])('rejects invalid registration: %j', (change) => {
    expect(() => validateAuthInput({ ...registration, ...change }, true)).toThrow();
  });
});
