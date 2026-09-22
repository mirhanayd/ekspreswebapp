import { NextRequest } from 'next/server';
import { authenticateRequest } from '@/lib/server-auth';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  return authenticateRequest(request, 'register');
}
