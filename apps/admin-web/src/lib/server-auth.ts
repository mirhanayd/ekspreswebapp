import {
  ACCESS_TOKEN_TTL_SECONDS,
  adminService,
  authService,
  ServerError,
  signAccessToken,
} from '@ekspres/database';
import { NextRequest, NextResponse } from 'next/server';
import { ADMIN_ACCESS_TOKEN_COOKIE } from './auth';

export async function requireAdminToken(token: string | undefined) {
  const principal = await authService.session(token);
  if (principal.role !== 'admin') throw new ServerError(403, 'Bu işlem yöneticiler içindir.');
  return principal;
}

export function requireAdmin(request: NextRequest) {
  return requireAdminToken(request.cookies.get(ADMIN_ACCESS_TOKEN_COOKIE)?.value);
}

export async function adminData(path: string) {
  if (path === '/admin/metrics') return adminService.getMetrics();
  if (path === '/admin/overview') return adminService.getOverview();
  if (path === '/admin/transport') return adminService.getTransport();
  if (path === '/admin/tickets') return adminService.getTickets();
  if (path.startsWith('/admin/tickets/')) return adminService.getTicket(path.slice(15));
  if (path === '/admin/fleet') return adminService.getFleet();
  if (path === '/admin/reports') return adminService.getReports();
  throw new ServerError(404, 'Yönetim kaynağı bulunamadı.');
}

export function adminErrorResponse(error: unknown) {
  const status =
    error instanceof ServerError ? error.status : error instanceof SyntaxError ? 400 : 500;
  const message = error instanceof ServerError ? error.message : 'İşlem tamamlanamıyor.';
  if (status === 500) console.error('Admin serverless operation failed');
  const response = NextResponse.json({ message }, { status });
  if (status === 401) response.cookies.delete(ADMIN_ACCESS_TOKEN_COOKIE);
  return response;
}

export async function adminLogin(request: NextRequest) {
  try {
    const text = await request.text();
    if (Buffer.byteLength(text, 'utf8') > 16384) throw new ServerError(413, 'İstek çok büyük.');
    const principal = await authService.login(JSON.parse(text), 'admin');
    const response = NextResponse.json({ authenticated: true });
    response.cookies.set(ADMIN_ACCESS_TOKEN_COOKIE, signAccessToken(principal), {
      httpOnly: true,
      sameSite: 'lax',
      secure:
        request.nextUrl.protocol === 'https:' ||
        request.headers.get('x-forwarded-proto') === 'https',
      path: '/',
      maxAge: ACCESS_TOKEN_TTL_SECONDS,
    });
    return response;
  } catch (error) {
    return adminErrorResponse(error);
  }
}
