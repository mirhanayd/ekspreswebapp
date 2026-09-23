import { seatService, ServerError } from '@ekspres/database';
import { NextRequest } from 'next/server';
import { requirePassenger } from '@/lib/server-auth';
import { seatErrorResponse } from '@/lib/server-seats';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const text = await request.text();
    if (Buffer.byteLength(text, 'utf8') > 16384) throw new ServerError(413, 'İstek çok büyük.');
    const principal = await requirePassenger(request);
    return Response.json(await seatService.createHold(JSON.parse(text), principal.id), {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (error) {
    return seatErrorResponse(error);
  }
}
