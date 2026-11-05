import { notificationService } from '@ekspres/database';
import { NextRequest } from 'next/server';
import { requirePassenger } from '@/lib/server-auth';
import { notificationErrorResponse, readJson } from '@/lib/server-notifications';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const principal = await requirePassenger(request);
    await notificationService.saveSubscription(
      principal.id,
      await readJson(request),
      request.headers.get('user-agent'),
    );
    return Response.json({ subscribed: true }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return notificationErrorResponse(error);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const principal = await requirePassenger(request);
    const body = (await readJson(request)) as { endpoint?: unknown };
    await notificationService.removeSubscription(principal.id, body?.endpoint);
    return Response.json({ subscribed: false }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return notificationErrorResponse(error);
  }
}
