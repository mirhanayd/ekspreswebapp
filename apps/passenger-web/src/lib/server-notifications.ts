import { ServerError } from '@ekspres/database';
import { NextRequest, NextResponse } from 'next/server';
import { ACCESS_TOKEN_COOKIE } from './auth';

export function notificationErrorResponse(error: unknown) {
  const status =
    error instanceof ServerError ? error.status : error instanceof SyntaxError ? 400 : 500;
  const message =
    error instanceof ServerError
      ? error.message
      : status === 400
        ? 'Geçersiz istek.'
        : 'Bildirim işlemi şu anda tamamlanamıyor.';
  if (status === 500) console.error('Passenger notification operation failed');
  const response = NextResponse.json(
    { message },
    { status, headers: { 'Cache-Control': 'no-store' } },
  );
  if (status === 401) response.cookies.delete(ACCESS_TOKEN_COOKIE);
  return response;
}

/** Small JSON bodies only; notification payloads never need more. */
export async function readJson(request: NextRequest): Promise<unknown> {
  const text = await request.text();
  if (Buffer.byteLength(text, 'utf8') > 8192) throw new ServerError(413, 'İstek çok büyük.');
  return JSON.parse(text);
}
