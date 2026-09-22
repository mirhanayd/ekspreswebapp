import * as bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';
import { users } from '../schema/users.js';
import { serverDatabase } from './database.js';
import { ServerError } from './errors.js';
import { verifyAccessToken, type UserRole } from './auth.js';

type Database = ReturnType<typeof serverDatabase>;
type LoginInput = { email: string; password: string };
type RegistrationInput = LoginInput & { firstName: string; lastName: string };

export function validateAuthInput(body: unknown, registration: true): RegistrationInput;
export function validateAuthInput(body: unknown, registration?: false): LoginInput;
export function validateAuthInput(
  body: unknown,
  registration = false,
): LoginInput | RegistrationInput {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new ServerError(400, 'Giriş bilgileri geçersiz.');
  }
  const value = body as Record<string, unknown>;
  if (
    typeof value.email !== 'string' ||
    value.email.length > 254 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.email) ||
    typeof value.password !== 'string' ||
    value.password.length < (registration ? 8 : 1) ||
    value.password.length > 4096 ||
    (registration && Buffer.byteLength(value.password, 'utf8') > 72)
  ) {
    throw new ServerError(400, 'E-posta veya şifre geçersiz.');
  }
  const input = { email: value.email, password: value.password };
  if (!registration) return input;
  if (
    typeof value.firstName !== 'string' ||
    value.firstName.trim().length < 2 ||
    value.firstName.length > 100 ||
    typeof value.lastName !== 'string' ||
    value.lastName.trim().length < 2 ||
    value.lastName.length > 100
  ) {
    throw new ServerError(400, 'Ad ve soyad geçersiz.');
  }
  return { ...input, firstName: value.firstName.trim(), lastName: value.lastName.trim() };
}

const publicColumns = {
  id: users.id,
  email: users.email,
  firstName: users.firstName,
  lastName: users.lastName,
  role: users.role,
  createdAt: users.createdAt,
  updatedAt: users.updatedAt,
};

/** Injectable DB keeps these services usable from Node handlers and isolated integration tests. */
export function createAuthService(database: () => Database = serverDatabase) {
  return {
    async login(body: unknown, requiredRole?: UserRole) {
      const input = validateAuthInput(body);
      // Preserve existing case-sensitive registration/login identities during migration.
      const user = await database().query.users.findFirst({ where: eq(users.email, input.email) });
      if (!user || !(await bcrypt.compare(input.password, user.passwordHash))) {
        throw new ServerError(401, 'Giriş bilgileri doğrulanamadı.');
      }
      if (requiredRole && user.role !== requiredRole) {
        throw new ServerError(403, 'Bu hesap uygulamaya yetkili değil.');
      }
      return { id: user.id, email: user.email, role: user.role };
    },

    async register(body: unknown) {
      const input = validateAuthInput(body, true);
      const passwordHash = await bcrypt.hash(input.password, 10);
      // The unique email constraint, not a check-then-insert, arbitrates concurrent requests.
      const [user] = await database()
        .insert(users)
        .values({
          email: input.email,
          passwordHash,
          firstName: input.firstName,
          lastName: input.lastName,
          role: 'passenger',
        })
        .onConflictDoNothing({ target: users.email })
        .returning(publicColumns);
      if (!user) throw new ServerError(409, 'Bu e-posta zaten kullanımda.');
      return user;
    },

    async session(token: string | undefined) {
      const principal = token ? verifyAccessToken(token) : null;
      if (!principal) throw new ServerError(401, 'Oturum açmanız gerekiyor.');
      const [user] = await database()
        .select(publicColumns)
        .from(users)
        .where(eq(users.id, principal.sub))
        .limit(1);
      if (!user) throw new ServerError(401, 'Oturum açmanız gerekiyor.');
      return user;
    },
  };
}

export const authService = createAuthService();
