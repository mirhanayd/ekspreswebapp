import { z } from 'zod';

export const RegisterDtoSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, 'Password must be at least 8 characters long'),
  firstName: z.string().min(2),
  lastName: z.string().min(2),
});

export type RegisterDto = z.infer<typeof RegisterDtoSchema>;

export const LoginDtoSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1, 'Password is required'),
});

export type LoginDto = z.infer<typeof LoginDtoSchema>;
