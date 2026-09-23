import { describe, expect, it } from 'vitest';
import { adminFleetFreshness } from '../src/server/admin-service.js';

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
