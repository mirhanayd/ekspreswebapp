import { createHmac, timingSafeEqual } from 'node:crypto';

export type AccessTokenPrincipal = {
  sub: string;
  email: string;
  role: string;
  iat: number;
  exp: number;
};

function secret() {
  const value = process.env.JWT_SECRET;
  if (!value) throw new Error('JWT_SECRET is not configured.');
  return value;
}

function encode(value: object) {
  return Buffer.from(JSON.stringify(value)).toString('base64url');
}

function signature(input: string) {
  return createHmac('sha256', secret()).update(input).digest('base64url');
}

export function signAccessToken(principal: { id: string; email: string; role: string }) {
  const now = Math.floor(Date.now() / 1000);
  const header = encode({ alg: 'HS256', typ: 'JWT' });
  const payload = encode({
    sub: principal.id,
    email: principal.email,
    role: principal.role,
    iat: now,
    exp: now + 60 * 60 * 24,
  });
  const input = `${header}.${payload}`;
  return `${input}.${signature(input)}`;
}

export function verifyAccessToken(token: string): AccessTokenPrincipal | null {
  const [header, payload, providedSignature] = token.split('.');
  if (!header || !payload || !providedSignature) return null;

  const expected = signature(`${header}.${payload}`);
  const left = Buffer.from(providedSignature);
  const right = Buffer.from(expected);
  if (left.length !== right.length || !timingSafeEqual(left, right)) return null;

  try {
    const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as Partial<AccessTokenPrincipal>;
    const now = Math.floor(Date.now() / 1000);
    if (
      typeof decoded.sub !== 'string' ||
      typeof decoded.email !== 'string' ||
      typeof decoded.role !== 'string' ||
      typeof decoded.exp !== 'number' ||
      decoded.exp <= now
    ) {
      return null;
    }

    return decoded as AccessTokenPrincipal;
  } catch {
    return null;
  }
}
