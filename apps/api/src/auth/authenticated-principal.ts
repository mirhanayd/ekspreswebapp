export type UserRole = 'admin' | 'passenger' | 'driver';

export type AuthenticatedPrincipal = {
  userId: string;
  email: string;
  role: UserRole;
};
