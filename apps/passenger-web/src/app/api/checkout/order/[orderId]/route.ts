import { checkoutService } from '@ekspres/database';
import { NextRequest } from 'next/server';
import { requirePassenger } from '@/lib/server-auth';
import { checkoutErrorResponse } from '@/lib/server-checkout';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest, context: { params: Promise<{ orderId: string }> }) {
  try {
    const [principal, { orderId }] = await Promise.all([requirePassenger(request), context.params]);
    return Response.json(await checkoutService.getOrder(orderId, principal.id), {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (error) {
    return checkoutErrorResponse(error);
  }
}
