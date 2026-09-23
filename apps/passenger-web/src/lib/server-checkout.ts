import { ServerError } from '@ekspres/database';
import { NextResponse } from 'next/server';
import { ACCESS_TOKEN_COOKIE } from './auth';

export function checkoutErrorResponse(error: unknown) {
  const status =
    error instanceof ServerError ? error.status : error instanceof SyntaxError ? 400 : 500;
  const message =
    error instanceof ServerError
      ? error.message
      : status === 400
        ? 'Geçersiz istek.'
        : 'İşlem şu anda tamamlanamıyor.';
  if (status === 500) console.error('Passenger checkout operation failed');
  const response = NextResponse.json(
    { message },
    { status, headers: { 'Cache-Control': 'no-store' } },
  );
  if (status === 401) response.cookies.delete(ACCESS_TOKEN_COOKIE);
  return response;
}

export async function checkoutRequestBody(request: Request) {
  const text = await request.text();
  if (Buffer.byteLength(text, 'utf8') > 16384) throw new ServerError(413, 'İstek çok büyük.');
  return JSON.parse(text) as unknown;
}
