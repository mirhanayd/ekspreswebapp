import { trackingService } from '@ekspres/database';
import { NextRequest } from 'next/server';
import { requirePassenger } from '@/lib/server-auth';
import { trackingErrorResponse } from '@/lib/server-tracking';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ ticketId: string }> },
) {
  try {
    const [principal, { ticketId }] = await Promise.all([
      requirePassenger(request),
      context.params,
    ]);
    return Response.json(await trackingService.createRealtimeToken(ticketId, principal.id), {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (error) {
    return trackingErrorResponse(error);
  }
}
