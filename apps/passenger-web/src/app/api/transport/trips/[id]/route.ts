import { getTripDetails, transportErrorResponse } from '@/lib/server-transport';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    return Response.json(await getTripDetails(id), {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (error) {
    return transportErrorResponse(error);
  }
}
