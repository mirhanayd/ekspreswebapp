import { createHmac } from 'node:crypto';
import { describe, expect, it, vi } from 'vitest';
import {
  createManagedRealtimeTokenRequest,
  managedTrackingChannel,
  publishManagedTrackingPosition,
} from '../src/server/tracking-service.js';

describe('managed realtime tracking token', () => {
  const userId = '11111111-1111-4111-8111-111111111111';
  const tripId = '22222222-2222-4222-8222-222222222222';

  it('signs a short-lived subscribe-only capability for one entitled trip channel', () => {
    const request = createManagedRealtimeTokenRequest('app.key:server-secret', {
      userId,
      tripId,
      now: 1_790_000_000_000,
      nonce: 'fixed-nonce',
    });
    const expectedCapability = JSON.stringify({
      [`trip:${tripId}:location`]: ['subscribe'],
    });
    const signText = [
      'app.key',
      '300000',
      expectedCapability,
      `passenger:${userId}`,
      '1790000000000',
      'fixed-nonce',
      '',
    ].join('\n');

    expect(request).toEqual({
      keyName: 'app.key',
      ttl: 300_000,
      capability: expectedCapability,
      clientId: `passenger:${userId}`,
      timestamp: 1_790_000_000_000,
      nonce: 'fixed-nonce',
      mac: createHmac('sha256', 'server-secret').update(signText).digest('base64'),
    });
    expect(JSON.parse(request.capability)).toEqual({
      [`trip:${tripId}:location`]: ['subscribe'],
    });
  });

  it('rejects malformed identifiers and provider keys', () => {
    expect(() => managedTrackingChannel('not-a-trip')).toThrow('tripId');
    expect(() => createManagedRealtimeTokenRequest('invalid', { userId, tripId })).toThrow(
      'yapılandırması geçersiz',
    );
  });

  it('publishes driver GPS to the matching channel without exposing the key in content', async () => {
    const fetcher = vi.fn(
      async (_input: string | URL | Request, _init?: RequestInit) =>
        new Response(null, { status: 201 }),
    );
    const position = {
      tripId,
      busId: '33333333-3333-4333-8333-333333333333',
      longitude: 41.75,
      latitude: 38.01,
      speedKph: 72,
      headingDeg: 120,
      recordedAt: '2026-09-23T12:00:00.000Z',
      sequence: 1,
      source: 'MOBILE_APP',
    };

    await expect(
      publishManagedTrackingPosition(position, {
        apiKey: 'app.key:server-secret',
        fetcher,
      }),
    ).resolves.toBe(true);
    const [url, init] = fetcher.mock.calls[0]!;
    expect(url).toContain(encodeURIComponent(`trip:${tripId}:location`));
    expect(JSON.parse(String(init?.body))).toEqual({ name: 'location', data: position });
    expect(JSON.stringify({ url, body: init?.body })).not.toContain('server-secret');
  });
});
