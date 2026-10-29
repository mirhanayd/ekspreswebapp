import { NextResponse } from 'next/server';
import { ADMIN_ACCESS_TOKEN_COOKIE } from '@/lib/auth';

function signOut(request: Request) {
  const response = NextResponse.redirect(new URL('/login', request.url), 303);
  response.cookies.delete(ADMIN_ACCESS_TOKEN_COOKIE);
  return response;
}

export async function POST(request: Request) {
  return signOut(request);
}

/** Navigable sign-out used when a server render finds the session expired or revoked. */
export async function GET(request: Request) {
  return signOut(request);
}
