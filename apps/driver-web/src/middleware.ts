import { NextRequest, NextResponse } from 'next/server';
import { ACCESS_TOKEN_COOKIE } from './lib/auth';

export function middleware(request: NextRequest) {
  const token = request.cookies.get(ACCESS_TOKEN_COOKIE)?.value;
  const isLogin = request.nextUrl.pathname === '/login';

  if (!token && !isLogin) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  if (token && isLogin) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/', '/login'],
};
