import { NextRequest, NextResponse } from 'next/server';
import { ACCESS_TOKEN_COOKIE } from '@/lib/auth';
import { API_BASE_URL } from '@/lib/server-api';

export async function POST(request: NextRequest) {
  const upstream = await fetch(`${API_BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: await request.text(),
    cache: 'no-store',
  });
  const payload = await upstream.json().catch(() => ({}));
  if (!upstream.ok || typeof payload.accessToken !== 'string') {
    return NextResponse.json(
      { message: payload.message || 'Hesap oluşturulamadı.' },
      { status: upstream.status },
    );
  }

  const response = NextResponse.json({ authenticated: true });
  response.cookies.set(ACCESS_TOKEN_COOKIE, payload.accessToken, {
    httpOnly: true,
    sameSite: 'lax',
    secure:
      request.nextUrl.protocol === 'https:' || request.headers.get('x-forwarded-proto') === 'https',
    path: '/',
    maxAge: 60 * 60 * 24,
  });
  return response;
}
