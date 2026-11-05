import { notificationService } from '@ekspres/database';
import { NextRequest } from 'next/server';
import { requirePassenger } from '@/lib/server-auth';
import { notificationErrorResponse, readJson } from '@/lib/server-notifications';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const principal = await requirePassenger(request);
    return Response.json(await notificationService.getPreferences(principal.id), {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (error) {
    return notificationErrorResponse(error);
  }
}

export async function PUT(request: NextRequest) {
  try {
    const principal = await requirePassenger(request);
    return Response.json(
      await notificationService.setPreferences(principal.id, await readJson(request)),
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (error) {
    return notificationErrorResponse(error);
  }
}
