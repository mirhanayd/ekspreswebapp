import { NextRequest, NextResponse } from 'next/server';
import { ADMIN_ACCESS_TOKEN_COOKIE } from '@/lib/auth';
import { API_BASE_URL } from '@/lib/server-api';

export async function POST(request: NextRequest) {
  const loginResponse = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: await request.text(),
    cache: 'no-store',
  });
  const login = await loginResponse.json().catch(() => ({}));
  if (!loginResponse.ok || typeof login.accessToken !== 'string') {
    return NextResponse.json(
      { message: login.message || 'Giriş bilgileri doğrulanamadı.' },
      { status: loginResponse.status },
    );
  }

  const profileResponse = await fetch(`${API_BASE_URL}/auth/me`, {
    headers: { Authorization: `Bearer ${login.accessToken}` },
    cache: 'no-store',
  });
  const profile = await profileResponse.json().catch(() => ({}));
  if (!profileResponse.ok || profile.role !== 'admin') {
    return NextResponse.json({ message: 'Bu hesap yönetim paneline erişemez.' }, { status: 403 });
  }

  const response = NextResponse.json({ authenticated: true });
  response.cookies.set(ADMIN_ACCESS_TOKEN_COOKIE, login.accessToken, {
    httpOnly: true,
    sameSite: 'lax',
    secure:
      request.nextUrl.protocol === 'https:' || request.headers.get('x-forwarded-proto') === 'https',
    path: '/',
    maxAge: 60 * 60 * 24,
  });
  return response;
}
