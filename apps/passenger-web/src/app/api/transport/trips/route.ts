import { getTrips, transportErrorResponse } from '@/lib/server-transport';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const params = new URL(request.url).searchParams;
    return Response.json(
      await getTrips({
        date: params.get('date') || undefined,
        originId: params.get('originId') || undefined,
        destinationId: params.get('destinationId') || undefined,
      }),
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (error) {
    return transportErrorResponse(error);
  }
}
