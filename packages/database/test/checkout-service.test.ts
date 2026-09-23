import { describe, expect, it } from 'vitest';
import { validateCheckoutOrderInput } from '../src/server/checkout-service.js';

describe('checkout order input validation', () => {
  const valid = {
    tripId: '11111111-1111-4111-8111-111111111111',
    seatNo: ' 7 ',
    holdId: '22222222-2222-4222-8222-222222222222',
    passengerFirstName: ' Ada ',
    passengerLastName: ' Lovelace ',
    passengerEmail: ' ada@example.test ',
    idempotencyKey: ' retry-1 ',
  };

  it('normalizes the public checkout contract without accepting a client total', () => {
    expect(validateCheckoutOrderInput({ ...valid, totalMinor: 1 })).toEqual({
      ...valid,
      seatNo: '7',
      passengerFirstName: 'Ada',
      passengerLastName: 'Lovelace',
      passengerEmail: 'ada@example.test',
      idempotencyKey: 'retry-1',
    });
  });

  it.each([
    undefined,
    {},
    { ...valid, tripId: 'invalid' },
    { ...valid, holdId: 'invalid' },
    { ...valid, seatNo: '' },
    { ...valid, passengerFirstName: '' },
    { ...valid, passengerEmail: 'not-an-email' },
    { ...valid, idempotencyKey: 'x'.repeat(201) },
  ])('rejects invalid checkout input: %j', (input) => {
    expect(() => validateCheckoutOrderInput(input)).toThrow();
  });
});
