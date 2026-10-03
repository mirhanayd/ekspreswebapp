import { NextRequest } from 'next/server';
import { adminData, adminErrorResponse, requireAdmin } from '@/lib/server-auth';
import { driverAdminService, ServerError } from '@ekspres/database';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(_request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  try {
    const [, { path }] = await Promise.all([requireAdmin(_request), context.params]);
    if (path.length === 1 && path[0] === 'drivers')
      return Response.json(await driverAdminService.listDrivers(), {
        headers: { 'Cache-Control': 'no-store' },
      });
    if (path.length === 3 && path[0] === 'trips' && path[2] === 'driver')
      return Response.json(await driverAdminService.getAssignment(path[1]!), {
        headers: { 'Cache-Control': 'no-store' },
      });
    return Response.json(await adminData(`/admin/${path.join('/')}`), {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (error) {
    return adminErrorResponse(error);
  }
}

type Context = { params: Promise<{ path: string[] }> };

async function body(request: NextRequest) {
  const text = await request.text();
  if (Buffer.byteLength(text, 'utf8') > 16384) throw new ServerError(413, 'İstek çok büyük.');
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    throw new ServerError(422, 'İstek gövdesi geçersiz.');
  }
}

function requireSameOrigin(request: NextRequest) {
  const origin = request.headers.get('origin');
  const protocol = request.headers.get('x-forwarded-proto') || request.nextUrl.protocol.replace(':', '');
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host');
  const expected = `${protocol}://${host}`;
  if (!origin || origin !== expected) throw new ServerError(403, 'İstek kaynağı reddedildi.');
}

export async function POST(request: NextRequest, context: Context) {
  try {
    requireSameOrigin(request);
    const [admin, { path }] = await Promise.all([requireAdmin(request), context.params]);
    if (path.length === 3 && path[0] === 'drivers' && path[2] === 'reset-password') {
      const input = await body(request);
      return Response.json(
        await driverAdminService.resetDriverPassword(admin.id, path[1]!, input.password),
      );
    }
    if (path.length !== 1 || path[0] !== 'drivers')
      throw new ServerError(404, 'Yönetim kaynağı bulunamadı.');
    return Response.json(await driverAdminService.createDriverAccount(admin.id, await body(request)), {
      status: 201,
    });
  } catch (error) {
    return adminErrorResponse(error);
  }
}

export async function PATCH(request: NextRequest, context: Context) {
  try {
    requireSameOrigin(request);
    const [admin, { path }] = await Promise.all([requireAdmin(request), context.params]);
    if (path.length !== 2 || path[0] !== 'drivers')
      throw new ServerError(404, 'Yönetim kaynağı bulunamadı.');
    const input = await body(request);
    return Response.json(
      await driverAdminService.setDriverActive(admin.id, path[1]!, input.isActive as boolean),
    );
  } catch (error) {
    return adminErrorResponse(error);
  }
}

export async function PUT(request: NextRequest, context: Context) {
  try {
    requireSameOrigin(request);
    const [admin, { path }] = await Promise.all([requireAdmin(request), context.params]);
    if (path.length !== 3 || path[0] !== 'trips' || path[2] !== 'driver')
      throw new ServerError(404, 'Yönetim kaynağı bulunamadı.');
    const input = await body(request);
    if (typeof input.driverId !== 'string')
      throw new ServerError(422, 'Sürücü seçin.');
    return Response.json(
      await driverAdminService.assign(
        admin.id,
        path[1]!,
        input.driverId,
        input.override === true,
        typeof input.reason === 'string' ? input.reason : undefined,
      ),
    );
  } catch (error) {
    return adminErrorResponse(error);
  }
}

export async function DELETE(request: NextRequest, context: Context) {
  try {
    requireSameOrigin(request);
    const [admin, { path }] = await Promise.all([requireAdmin(request), context.params]);
    if (path.length !== 3 || path[0] !== 'trips' || path[2] !== 'driver')
      throw new ServerError(404, 'Yönetim kaynağı bulunamadı.');
    return Response.json(await driverAdminService.unassign(admin.id, path[1]!));
  } catch (error) {
    return adminErrorResponse(error);
  }
}
