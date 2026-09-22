import { ServerError, seatService } from '@ekspres/database';
import { NextResponse } from 'next/server';
import { ACCESS_TOKEN_COOKIE } from './auth';

export function seatErrorResponse(error: unknown) {
  const status =
    error instanceof ServerError ? error.status : error instanceof SyntaxError ? 400 : 500;
  const message =
    error instanceof ServerError
      ? error.message
      : status === 400
        ? 'Geçersiz istek.'
        : 'İşlem şu anda tamamlanamıyor.';
  if (status === 500) console.error('Passenger seat operation failed');
  const response = NextResponse.json(
    { message },
    { status, headers: { 'Cache-Control': 'no-store' } },
  );
  if (status === 401) response.cookies.delete(ACCESS_TOKEN_COOKIE);
  return response;
}

export function getSeatMap(tripId: string) {
  return seatService.getSeatMap(tripId);
}
