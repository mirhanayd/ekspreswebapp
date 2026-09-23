import { createHmac, timingSafeEqual } from 'node:crypto';

export type UserRole = 'passenger' | 'driver' | 'admin';
export type AccessTokenPrincipal = {
  sub: string;
  email: string;
  role: UserRole;
  iat: number;
  exp: number;
};

export const ACCESS_TOKEN_TTL_SECONDS = 60 * 60 * 24;

function signature(input: string) {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET is not configured.');
  return createHmac('sha256', secret).update(input).digest('base64url');
}

function encode(value: object) {
  return Buffer.from(JSON.stringify(value)).toString('base64url');
}

export function signAccessToken(principal: { id: string; email: string; role: string }) {
  return signJwtPayload(
    { sub: principal.id, email: principal.email, role: principal.role },
    ACCESS_TOKEN_TTL_SECONDS,
  );
}

export function signJwtPayload(payload: Record<string, unknown>, expiresInSeconds: number) {
  if (!Number.isSafeInteger(expiresInSeconds) || expiresInSeconds < 1) {
    throw new Error('JWT expiry must be a positive integer.');
  }
  const now = Math.floor(Date.now() / 1000);
  const input = `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode({
    ...payload,
    iat: now,
    exp: now + expiresInSeconds,
  })}`;
  return `${input}.${signature(input)}`;
}

/** Accept the existing HS256 NestJS contract, never unsigned or other algorithms. */
export function verifyAccessToken(token: string): AccessTokenPrincipal | null {
  if (token.length > 8192) return null;
  const parts = token.split('.');
  if (parts.length !== 3 || parts.some((part) => !/^[A-Za-z0-9_-]+$/.test(part))) return null;
  const [header, payload, provided] = parts as [string, string, string];
  const expected = signature(`${header}.${payload}`);
  const left = Buffer.from(provided);
  const right = Buffer.from(expected);
  if (left.length !== right.length || !timingSafeEqual(left, right)) return null;

  try {
    const metadata = JSON.parse(Buffer.from(header, 'base64url').toString('utf8'));
    if (metadata?.alg !== 'HS256' || metadata.typ !== 'JWT' || metadata.crit !== undefined) {
      return null;
    }
    const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    const now = Math.floor(Date.now() / 1000);
    if (
      !decoded ||
      typeof decoded.sub !== 'string' ||
      !/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(decoded.sub) ||
      typeof decoded.email !== 'string' ||
      !decoded.email ||
      !['passenger', 'driver', 'admin'].includes(decoded.role) ||
      !Number.isSafeInteger(decoded.iat) ||
      decoded.iat > now ||
      !Number.isSafeInteger(decoded.exp) ||
      decoded.exp <= now ||
      (decoded.nbf !== undefined && (!Number.isSafeInteger(decoded.nbf) || decoded.nbf > now))
    ) {
      return null;
    }
    return {
      sub: decoded.sub,
      email: decoded.email,
      role: decoded.role,
      iat: decoded.iat,
      exp: decoded.exp,
    };
  } catch {
    return null;
  }
}
