import { NextRequest } from 'next/server';
import { ACCESS_TOKEN_COOKIE } from '@/lib/auth';
import { verifyAccessToken } from '@/lib/server-auth';
import {
  DriverBackendError,
  getDriverTrip,
  listDriverTrips,
  recordDriverLocation,
  updateDriverPassengerStatus,
  updateDriverTripStatus,
} from '../../../../../../../../packages/database/src/server/driver-backend';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const tripStatuses = new Set(['scheduled', 'boarding', 'in_transit', 'completed']);
const boardingStatuses = new Set(['pending', 'boarded', 'no_show']);

function json(message: unknown, status = 200) {
  return Response.json(message, { status });
}

function principal(request: NextRequest) {
  const token = request.cookies.get(ACCESS_TOKEN_COOKIE)?.value;
  if (!token) throw new DriverBackendError(401, 'Oturum açmanız gerekiyor.');

  const decoded = verifyAccessToken(token);
  if (!decoded) throw new DriverBackendError(401, 'Oturum süresi dolmuş.');
  if (decoded.role !== 'driver') {
    throw new DriverBackendError(403, 'Bu hesap sürücü uygulamasına yetkili değil.');
  }

  return decoded;
}

function validateLocation(body: Record<string, unknown>) {
  const longitude = body.longitude;
  const latitude = body.latitude;
  const speedKph = body.speedKph ?? 0;
  const headingDeg = body.headingDeg ?? 0;
  const recordedAt = body.recordedAt;

  if (
    typeof longitude !== 'number' ||
    longitude < -180 ||
    longitude > 180 ||
    typeof latitude !== 'number' ||
    latitude < -90 ||
    latitude > 90 ||
    typeof speedKph !== 'number' ||
    speedKph < 0 ||
    speedKph > 180 ||
    typeof headingDeg !== 'number' ||
    headingDeg < 0 ||
    headingDeg > 360 ||
    (recordedAt !== undefined &&
      (typeof recordedAt !== 'string' || Number.isNaN(Date.parse(recordedAt))))
  ) {
    throw new DriverBackendError(400, 'Konum verisi geçersiz.');
  }

  return {
    longitude,
    latitude,
    speedKph,
    headingDeg,
    recordedAt: recordedAt as string | undefined,
  };
}

async function handler(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  try {
    const user = principal(request);
    const { path } = await context.params;

    if (request.method === 'GET' && path.length === 1 && path[0] === 'trips') {
      return json(await listDriverTrips(user.sub));
    }

    if (request.method === 'GET' && path.length === 2 && path[0] === 'trips') {
      return json(await getDriverTrip(user.sub, path[1]));
    }

    if (
      request.method === 'PATCH' &&
      path.length === 3 &&
      path[0] === 'trips' &&
      path[2] === 'status'
    ) {
      const body = (await request.json()) as { status?: unknown };
      if (typeof body.status !== 'string' || !tripStatuses.has(body.status)) {
        throw new DriverBackendError(400, 'Sefer durumu geçersiz.');
      }
      return json(
        await updateDriverTripStatus(
          user.sub,
          path[1],
          body.status as 'scheduled' | 'boarding' | 'in_transit' | 'completed',
        ),
      );
    }

    if (
      request.method === 'PATCH' &&
      path.length === 4 &&
      path[0] === 'trips' &&
      path[2] === 'passengers'
    ) {
      const body = (await request.json()) as { status?: unknown };
      if (typeof body.status !== 'string' || !boardingStatuses.has(body.status)) {
        throw new DriverBackendError(400, 'Yolcu durumu geçersiz.');
      }
      return json(
        await updateDriverPassengerStatus(
          user.sub,
          path[1],
          path[3],
          body.status as 'pending' | 'boarded' | 'no_show',
        ),
      );
    }

    if (
      request.method === 'POST' &&
      path.length === 3 &&
      path[0] === 'trips' &&
      path[2] === 'location'
    ) {
      const body = (await request.json()) as Record<string, unknown>;
      return json(await recordDriverLocation(user.sub, path[1], validateLocation(body)), 201);
    }

    return json({ message: 'Endpoint bulunamadı.' }, 404);
  } catch (error) {
    if (error instanceof DriverBackendError) {
      return json({ message: error.message }, error.status);
    }

    console.error('Driver serverless API failed', error);
    return json({ message: 'İşlem şu anda tamamlanamıyor.' }, 500);
  }
}

export const GET = handler;
export const POST = handler;
export const PATCH = handler;
