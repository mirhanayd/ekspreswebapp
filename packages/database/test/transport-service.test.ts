import { describe, expect, it } from 'vitest';
import { validateTripSearch } from '../src/server/transport-service.js';

describe('transport query validation', () => {
  it('accepts the public trip search contract', () => {
    expect(
      validateTripSearch({
        date: '2026-09-22',
        originId: '11111111-1111-4111-8111-111111111111',
        destinationId: '22222222-2222-4222-8222-222222222222',
      }),
    ).toEqual({
      date: '2026-09-22',
      originId: '11111111-1111-4111-8111-111111111111',
      destinationId: '22222222-2222-4222-8222-222222222222',
    });
  });

  it.each([
    { date: '22-09-2026' },
    { date: '2026-02-30' },
    { originId: 'not-a-uuid' },
    { destinationId: 'not-a-uuid' },
  ])('rejects an invalid public filter: %j', (input) => {
    expect(() => validateTripSearch(input)).toThrow();
  });
});
