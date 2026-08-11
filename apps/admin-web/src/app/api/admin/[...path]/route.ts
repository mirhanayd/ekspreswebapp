import { NextRequest, NextResponse } from 'next/server';
import { ADMIN_ACCESS_TOKEN_COOKIE } from '@/lib/auth';
import { API_BASE_URL } from '@/lib/server-api';

export async function GET(_request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const token = _request.cookies.get(ADMIN_ACCESS_TOKEN_COOKIE)?.value;
  if (!token) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  const { path } = await context.params;
  const response = await fetch(`${API_BASE_URL}/admin/${path.join('/')}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
  const payload = await response.json().catch(() => ({}));
  return NextResponse.json(payload, { status: response.status });
}
