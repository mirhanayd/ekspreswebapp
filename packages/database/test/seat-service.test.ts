import { describe, expect, it } from 'vitest';
import { validateSeatHoldInput } from '../src/server/seat-service.js';

describe('seat hold input validation', () => {
  const tripId = '11111111-1111-4111-8111-111111111111';

  it('normalizes the existing hold contract', () => {
    expect(validateSeatHoldInput({ tripId, seatNo: ' 7 ' })).toEqual({ tripId, seatNo: '7' });
  });

  it.each([
    undefined,
    {},
    { tripId: 'invalid', seatNo: '7' },
    { tripId, seatNo: '' },
    { tripId, seatNo: 'x'.repeat(17) },
  ])('rejects invalid hold input: %j', (input) => {
    expect(() => validateSeatHoldInput(input)).toThrow();
  });
});
