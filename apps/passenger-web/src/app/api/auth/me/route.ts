import { NextRequest } from 'next/server';
import { ACCESS_TOKEN_COOKIE } from '@/lib/auth';
import { sessionResponse } from '@/lib/server-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  return sessionResponse(request.cookies.get(ACCESS_TOKEN_COOKIE)?.value);
}
