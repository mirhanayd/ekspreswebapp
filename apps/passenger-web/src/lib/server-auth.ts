import { NextRequest, NextResponse } from 'next/server';
import {
  authService,
  ServerError,
  signAccessToken,
  ACCESS_TOKEN_TTL_SECONDS,
} from '@ekspres/database';
import { ACCESS_TOKEN_COOKIE } from './auth';

export function authErrorResponse(error: unknown) {
  const status =
    error instanceof ServerError ? error.status : error instanceof SyntaxError ? 400 : 500;
  const message =
    error instanceof ServerError
      ? error.message
      : status === 400
        ? 'Geçersiz istek.'
        : 'İşlem şu anda tamamlanamıyor.';
  // Do not log DB/driver exceptions: their details can contain credentials or submitted data.
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
