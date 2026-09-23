import { NextRequest, NextResponse } from 'next/server';
import {
  authService,
  ServerError,
  signAccessToken,
  ACCESS_TOKEN_TTL_SECONDS,
} from '@ekspres/database';
import { ACCESS_TOKEN_COOKIE } from './auth';

export async function requirePassenger(request: NextRequest) {
  return requirePassengerToken(request.cookies.get(ACCESS_TOKEN_COOKIE)?.value);
}

export async function requirePassengerToken(token: string | undefined) {
  const principal = await authService.session(token);
  if (principal.role !== 'passenger') throw new ServerError(403, 'Bu işlem yolcular içindir.');
  return principal;
}

function authFailureKind(error: unknown) {
  if (!(error instanceof Error)) return 'unknown';
  if (error.message === 'DATABASE_URL is missing in environment variables or configuration.') {
    return 'missing_database_url';
  }
  if (error.message === 'JWT_SECRET is not configured.') return 'missing_jwt_secret';

  const code = (error as Error & { code?: unknown }).code;
  return typeof code === 'string' && /^[A-Z0-9]{2,10}$/.test(code)
    ? `database_${code}`
    : 'unexpected';
}

export function authErrorResponse(error: unknown) {
  const status =
    error instanceof ServerError ? error.status : error instanceof SyntaxError ? 400 : 500;
  const message =
    error instanceof ServerError
      ? error.message
      : status === 400
        ? 'Geçersiz istek.'
        : 'İşlem şu anda tamamlanamıyor.';
  // Record only a bounded category. Raw DB/config errors may contain credentials or submitted data.
  if (status === 500) console.error('Passenger authentication failed', authFailureKind(error));
  const response = NextResponse.json(
    { message },
    { status, headers: { 'Cache-Control': 'no-store' } },
  );
  if (status === 401) response.cookies.delete(ACCESS_TOKEN_COOKIE);
  return response;
}

export async function authenticateRequest(request: NextRequest, operation: 'login' | 'register') {
  try {
    if (!process.env.JWT_SECRET) throw new Error('JWT_SECRET is not configured.');
    const text = await request.text();
    if (Buffer.byteLength(text, 'utf8') > 16384) throw new ServerError(413, 'İstek çok büyük.');
    const body: unknown = JSON.parse(text);
    const user = await authService[operation](body);
    const response = NextResponse.json(
      { authenticated: true },
      { headers: { 'Cache-Control': 'no-store' } },
    );
    response.cookies.set(ACCESS_TOKEN_COOKIE, signAccessToken(user), {
      httpOnly: true,
      sameSite: 'lax',
      secure:
        request.nextUrl.protocol === 'https:' ||
        request.headers.get('x-forwarded-proto') === 'https',
      path: '/',
      maxAge: ACCESS_TOKEN_TTL_SECONDS,
    });
    return response;
  } catch (error) {
    return authErrorResponse(error);
  }
}

export async function sessionResponse(token: string | undefined) {
  try {
    return NextResponse.json(await authService.session(token), {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (error) {
    return authErrorResponse(error);
  }
}
