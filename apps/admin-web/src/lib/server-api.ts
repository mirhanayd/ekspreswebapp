import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { ServerError } from '@ekspres/database';
import { ADMIN_ACCESS_TOKEN_COOKIE } from './auth';
import { adminData, requireAdminToken } from './server-auth';

export async function adminApiJson<T>(path: string): Promise<T> {
  const token = (await cookies()).get(ADMIN_ACCESS_TOKEN_COOKIE)?.value;
  if (!token) redirect('/login');

  let sessionValid = true;
  try {
    await requireAdminToken(token);
  } catch (error) {
    if (!(error instanceof ServerError) || (error.status !== 401 && error.status !== 403)) {
      throw error;
    }
    sessionValid = false;
  }
  // An expired/revoked cookie would otherwise crash the page and middleware would keep
  // bouncing /login back to /dashboard; the GET logout clears it first.
  if (!sessionValid) redirect('/api/auth/logout');
  return (await adminData(path)) as T;
}

/**
 * Same contract as `adminApiJson` but degrades to a fallback instead of failing
 * the whole page, so a secondary panel can never take the console down.
 */
export async function adminApiJsonOptional<T>(path: string, fallback: T): Promise<T> {
  const token = (await cookies()).get(ADMIN_ACCESS_TOKEN_COOKIE)?.value;
  if (!token) return fallback;
  try {
    await requireAdminToken(token);
    return (await adminData(path)) as T;
  } catch {
    return fallback;
  }
}
