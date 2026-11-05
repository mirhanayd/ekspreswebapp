import { vapidConfigured } from '@ekspres/database';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * The VAPID public key is served from the server environment instead of a
 * NEXT_PUBLIC_* variable, so every VAPID value stays out of the client bundle.
 */
export async function GET() {
  if (!vapidConfigured()) {
    return Response.json({ message: 'Web Push yapılandırılmamış.' }, { status: 503 });
  }
  return Response.json(
    { publicKey: process.env.VAPID_PUBLIC_KEY },
    { headers: { 'Cache-Control': 'public, max-age=3600' } },
  );
}
