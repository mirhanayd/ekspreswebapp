import { createHmac } from 'node:crypto';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createTicketQrPayload } from '../src/server/ticket-service.js';

describe('ticket QR payload', () => {
  afterEach(() => vi.unstubAllEnvs());

  it('creates the existing short-lived HS256 contract without stored hash data', () => {
    vi.stubEnv('JWT_SECRET', 'ticket-unit-test-secret-with-more-than-32-chars');
    const ticket = {
      id: '11111111-1111-4111-8111-111111111111',
      ticketNo: 'TKT-TEST',
      tripId: '22222222-2222-4222-8222-222222222222',
      qrTokenHash: 'must-not-leak',
    };
    const result = createTicketQrPayload(ticket);
    const [header, body, signature] = result.payload.split('.');
    expect(JSON.parse(Buffer.from(header, 'base64url').toString())).toEqual({
      alg: 'HS256',
      typ: 'JWT',
    });
    const claims = JSON.parse(Buffer.from(body, 'base64url').toString());
    expect(claims).toMatchObject({
      purpose: 'ticket-qr',
      sub: ticket.id,
      ticketNo: ticket.ticketNo,
      tripId: ticket.tripId,
    });
    expect(claims.exp - claims.iat).toBe(300);
    expect(result.payload).not.toContain(ticket.qrTokenHash);
    expect(signature).toBe(
      createHmac('sha256', process.env.JWT_SECRET!).update(`${header}.${body}`).digest('base64url'),
    );
  });
});
