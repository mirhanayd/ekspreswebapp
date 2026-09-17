import { NextResponse } from 'next/server';
import { API_BASE_URL } from '@/lib/server-api';

export async function GET() {
  try {
    const response = await fetch(`${API_BASE_URL}/status`, {
      cache: 'no-store',
      signal: AbortSignal.timeout(15000),
    });

    return NextResponse.json(
      { ok: response.ok },
      { status: response.ok ? 200 : response.status || 503 },
    );
  } catch {
    return NextResponse.json({ ok: false }, { status: 503 });
  }
}
