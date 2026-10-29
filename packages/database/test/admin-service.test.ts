import { describe, expect, it } from 'vitest';
import { adminFleetFreshness, normalizeAdminTimestamp } from '../src/server/admin-service.js';

describe('admin fleet freshness', () => {
  it.each([
    [null, 'offline'],
    [181, 'offline'],
    [180, 'stale'],
    [61, 'stale'],
    [60, 'delayed'],
    [16, 'delayed'],
    [15, 'live'],
    [0, 'live'],
  ] as const)('maps %s seconds to %s', (age, expected) => {
    expect(adminFleetFreshness(age)).toBe(expected);
  });
});

describe('admin timestamp normalization', () => {
  it('normalizes raw SQL timestamps returned as strings', () => {
    expect(normalizeAdminTimestamp('2026-10-04T00:57:00.000Z')?.toISOString()).toBe(
      '2026-10-04T00:57:00.000Z',
    );
  });

  it('preserves Date values and nullable fields', () => {
    const date = new Date('2026-10-04T00:57:00.000Z');
    expect(normalizeAdminTimestamp(date)).toBe(date);
    expect(normalizeAdminTimestamp(null)).toBeNull();
  });
});
