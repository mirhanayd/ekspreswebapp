import { NextRequest, NextResponse } from 'next/server';
import { ACCESS_TOKEN_COOKIE } from './lib/auth';

export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const protectedPath =
    pathname.startsWith('/tickets') ||
    (pathname.startsWith('/trips/') &&
      (pathname.includes('/seats') ||
        pathname.includes('/checkout') ||
        pathname.includes('/live')));

  if (protectedPath && !request.cookies.has(ACCESS_TOKEN_COOKIE)) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('returnTo', `${pathname}${search}`);
    return NextResponse.redirect(loginUrl);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/tickets/:path*', '/trips/:path*'],
};
