import { NextRequest } from 'next/server';
import { adminData, adminErrorResponse, requireAdmin } from '@/lib/server-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(_request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  try {
    const [, { path }] = await Promise.all([requireAdmin(_request), context.params]);
    return Response.json(await adminData(`/admin/${path.join('/')}`), {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (error) {
    return adminErrorResponse(error);
  }
}
