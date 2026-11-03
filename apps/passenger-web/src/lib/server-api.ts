import { cookies } from 'next/headers';
import { ACCESS_TOKEN_COOKIE } from './auth';

/** Legacy NestJS base URL; only the temporary /api/passenger compatibility proxy still uses it. */
export const API_BASE_URL =
  process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

export async function getAccessToken(): Promise<string | undefined> {
  return (await cookies()).get(ACCESS_TOKEN_COOKIE)?.value;
}
