import { getSeatMap, seatErrorResponse } from '@/lib/server-seats';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(_request: Request, context: { params: Promise<{ tripId: string }> }) {
  try {
    const { tripId } = await context.params;
    return Response.json(await getSeatMap(tripId), {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (error) {
    return seatErrorResponse(error);
  }
}
