import { NextResponse } from 'next/server';
import { ACCESS_TOKEN_COOKIE } from '@/lib/auth';

export async function POST() {
  const response = NextResponse.json({ authenticated: false });
  response.cookies.delete(ACCESS_TOKEN_COOKIE);
  return response;
}
