import { checkoutService } from '@ekspres/database';
import { NextRequest } from 'next/server';
import { requirePassenger } from '@/lib/server-auth';
import { checkoutErrorResponse, checkoutRequestBody } from '@/lib/server-checkout';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const principal = await requirePassenger(request);
    const input = await checkoutRequestBody(request);
    return Response.json(await checkoutService.createOrder(input, principal.id), {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (error) {
    return checkoutErrorResponse(error);
  }
}
