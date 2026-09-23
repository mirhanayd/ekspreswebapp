import { seatService } from '@ekspres/database';
import { NextRequest } from 'next/server';
import { requirePassenger } from '@/lib/server-auth';
import { seatErrorResponse } from '@/lib/server-seats';

export const runtime = 'nodejs';

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ holdId: string }> },
) {
  try {
    const [principal, { holdId }] = await Promise.all([requirePassenger(request), context.params]);
    return Response.json(await seatService.releaseHold(holdId, principal.id), {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (error) {
    return seatErrorResponse(error);
  }
}
