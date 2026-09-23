import { ticketService } from '@ekspres/database';
import { NextRequest } from 'next/server';
import { requirePassenger } from '@/lib/server-auth';
import { ticketErrorResponse } from '@/lib/server-tickets';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ ticketId: string }> },
) {
  try {
    const [principal, { ticketId }] = await Promise.all([
      requirePassenger(request),
      context.params,
    ]);
    return Response.json(await ticketService.getTicketDetail(ticketId, principal.id), {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (error) {
    return ticketErrorResponse(error);
  }
}
