import { NextRequest } from 'next/server';
import { adminLogin } from '@/lib/server-auth';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  return adminLogin(request);
}
