import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { ADMIN_ACCESS_TOKEN_COOKIE } from './auth';

export const API_BASE_URL =
  process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

export async function adminApiJson<T>(path: string): Promise<T> {
  const token = (await cookies()).get(ADMIN_ACCESS_TOKEN_COOKIE)?.value;
  if (!token) redirect('/login');

  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
  if (response.status === 401 || response.status === 403) redirect('/login');
  if (!response.ok) throw new Error(`Admin API request failed (${response.status})`);
  return response.json() as Promise<T>;
}

/**
 * Same contract as `adminApiJson` but degrades to a fallback instead of failing
 * the whole page, so a secondary panel can never take the console down.
 */
export async function adminApiJsonOptional<T>(path: string, fallback: T): Promise<T> {
  const token = (await cookies()).get(ADMIN_ACCESS_TOKEN_COOKIE)?.value;
  if (!token) return fallback;
  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    });
    if (!response.ok) return fallback;
    return (await response.json()) as T;
  } catch {
    return fallback;
  }
}
