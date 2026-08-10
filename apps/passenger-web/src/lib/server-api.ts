import { cookies } from 'next/headers';
import { ACCESS_TOKEN_COOKIE } from './auth';

export const API_BASE_URL =
  process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

export async function getAccessToken(): Promise<string | undefined> {
  return (await cookies()).get(ACCESS_TOKEN_COOKIE)?.value;
}

export async function authenticatedApiFetch(path: string, init: Parameters<typeof fetch>[1] = {}) {
  const token = await getAccessToken();
  if (!token) return null;

  const headers = new Headers(init.headers);
  headers.set('Authorization', `Bearer ${token}`);
  return fetch(`${API_BASE_URL}${path}`, { ...init, headers, cache: 'no-store' });
}
