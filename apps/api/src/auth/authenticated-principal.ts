export type UserRole = 'admin' | 'passenger';

export type AuthenticatedPrincipal = {
  userId: string;
  email: string;
  role: UserRole;
};
