import { NextRequest, NextResponse } from 'next/server';
import { ADMIN_ACCESS_TOKEN_COOKIE } from '@/lib/auth';
import { API_BASE_URL } from '@/lib/server-api';

async function forward(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const token = request.cookies.get(ADMIN_ACCESS_TOKEN_COOKIE)?.value;
  if (!token) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  const { path } = await context.params;
  const response = await fetch(`${API_BASE_URL}/admin/${path.join('/')}`, {
    method: request.method,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(request.method !== 'DELETE' ? { 'Content-Type': 'application/json' } : {}),
    },
    body: request.method === 'DELETE' ? undefined : await request.text(),
    cache: 'no-store',
  });
  const payload = await response.json().catch(() => ({}));
  return NextResponse.json(payload, { status: response.status });
}

export const GET = forward;
export const PATCH = forward;
export const PUT = forward;
export const DELETE = forward;
