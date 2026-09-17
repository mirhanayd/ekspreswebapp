import { NextRequest, NextResponse } from 'next/server';
import { ACCESS_TOKEN_COOKIE } from '@/lib/auth';
import { API_BASE_URL } from '@/lib/server-api';

type AccessTokenPayload = {
  role?: string;
};

function decodeAccessTokenPayload(accessToken: string): AccessTokenPayload | null {
  try {
    const encodedPayload = accessToken.split('.')[1];
    if (!encodedPayload) return null;
    return JSON.parse(
      Buffer.from(encodedPayload, 'base64url').toString('utf8'),
    ) as AccessTokenPayload;
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  const upstream = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: await request.text(),
    cache: 'no-store',
  });
  const payload = await upstream.json().catch(() => ({}));
  if (!upstream.ok || typeof payload.accessToken !== 'string') {
    return NextResponse.json(
      { message: payload.message || 'Giriş bilgileri doğrulanamadı.' },
      { status: upstream.status },
    );
  }

  const tokenPayload = decodeAccessTokenPayload(payload.accessToken);
  if (tokenPayload?.role !== 'driver') {
    return NextResponse.json(
      { message: 'Bu hesap sürücü uygulamasına yetkili değil.' },
      { status: 403 },
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
