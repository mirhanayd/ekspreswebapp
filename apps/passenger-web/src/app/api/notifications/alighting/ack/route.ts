import { notificationService } from '@ekspres/database';
import { NextRequest } from 'next/server';
import { requirePassenger } from '@/lib/server-auth';
import { notificationErrorResponse, readJson } from '@/lib/server-notifications';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const principal = await requirePassenger(request);
    const body = (await readJson(request)) as { ids?: unknown };
    await notificationService.acknowledge(principal.id, body?.ids);
    return Response.json({ acknowledged: true }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return notificationErrorResponse(error);
  }
}
