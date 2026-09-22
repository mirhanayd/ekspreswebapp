import { getLocations, transportErrorResponse } from '@/lib/server-transport';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    return Response.json(await getLocations(), {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (error) {
    return transportErrorResponse(error);
  }
}
