import { NextRequest, NextResponse } from 'next/server';
import { ACCESS_TOKEN_COOKIE } from '@/lib/auth';
import { signAccessToken } from '@/lib/server-auth';
import {
  authenticateDriver,
  DriverBackendError,
} from '../../../../../../../packages/database/src/server/driver-backend';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { email?: unknown; password?: unknown };
    if (typeof body.email !== 'string' || typeof body.password !== 'string') {
      return NextResponse.json({ message: 'E-posta ve şifre zorunludur.' }, { status: 400 });
    }

    const principal = await authenticateDriver(body.email, body.password);
    const accessToken = signAccessToken(principal);
    const response = NextResponse.json({ authenticated: true });

    response.cookies.set(ACCESS_TOKEN_COOKIE, accessToken, {
      httpOnly: true,
      sameSite: 'lax',
      secure:
        request.nextUrl.protocol === 'https:' ||
        request.headers.get('x-forwarded-proto') === 'https',
      path: '/',
      maxAge: 60 * 60 * 24,
    });

    return response;
  } catch (error) {
    if (error instanceof DriverBackendError) {
      return NextResponse.json({ message: error.message }, { status: error.status });
    }

    console.error('Driver login failed', error);
    return NextResponse.json({ message: 'Giriş şu anda tamamlanamıyor.' }, { status: 500 });
  }
}
