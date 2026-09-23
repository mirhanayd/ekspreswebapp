import { ServerError } from '@ekspres/database';
import { NextResponse } from 'next/server';
import { ACCESS_TOKEN_COOKIE } from './auth';

export function trackingErrorResponse(error: unknown) {
  const status = error instanceof ServerError ? error.status : 500;
  const message = error instanceof ServerError ? error.message : 'Canlı takip başlatılamadı.';
  if (status === 500) console.error('Passenger tracking operation failed');
  const response = NextResponse.json(
    { message },
    { status, headers: { 'Cache-Control': 'no-store' } },
  );
  if (status === 401) response.cookies.delete(ACCESS_TOKEN_COOKIE);
  return response;
}
