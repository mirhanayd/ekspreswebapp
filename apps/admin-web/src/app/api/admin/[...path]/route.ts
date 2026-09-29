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
  return JSON.parse(text) as Record<string, unknown>;
}

export async function POST(request: NextRequest, context: Context) {
  try {
    const [admin, { path }] = await Promise.all([requireAdmin(request), context.params]);
    if (path.length === 3 && path[0] === 'drivers' && path[2] === 'reset-password') {
      const input = await body(request);
      return Response.json(
        await driverAdminService.resetDriverPassword(admin.id, path[1]!, input.password),
      );
    }
    if (path.length !== 1 || path[0] !== 'drivers')
      throw new ServerError(404, 'Yönetim kaynağı bulunamadı.');
    return Response.json(await driverAdminService.createDriver(admin.id, await body(request)), {
      status: 201,
    });
  } catch (error) {
    return adminErrorResponse(error);
  }
}

export async function PATCH(request: NextRequest, context: Context) {
  try {
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
    const [admin, { path }] = await Promise.all([requireAdmin(request), context.params]);
    if (path.length !== 3 || path[0] !== 'trips' || path[2] !== 'driver')
      throw new ServerError(404, 'Yönetim kaynağı bulunamadı.');
    const input = await body(request);
    if (typeof input.driverId !== 'string') throw new ServerError(400, 'Sürücü seçin.');
    return Response.json(await driverAdminService.assign(admin.id, path[1]!, input.driverId));
  } catch (error) {
    return adminErrorResponse(error);
  }
}

export async function DELETE(request: NextRequest, context: Context) {
  try {
    const [admin, { path }] = await Promise.all([requireAdmin(request), context.params]);
    if (path.length !== 3 || path[0] !== 'trips' || path[2] !== 'driver')
      throw new ServerError(404, 'Yönetim kaynağı bulunamadı.');
    return Response.json(await driverAdminService.unassign(admin.id, path[1]!));
  } catch (error) {
    return adminErrorResponse(error);
  }
}
