import { notificationService } from '@ekspres/database';
import { NextRequest } from 'next/server';
import { requirePassenger } from '@/lib/server-auth';
import { notificationErrorResponse } from '@/lib/server-notifications';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Alerts that never reached a lock screen and are still worth showing as an in-app banner. */
export async function GET(request: NextRequest) {
  try {
    const principal = await requirePassenger(request);
    return Response.json(
      { banners: await notificationService.pendingInAppBanners(principal.id) },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (error) {
    return notificationErrorResponse(error);
  }
}
