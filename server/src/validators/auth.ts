import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string(),
});

export const googleLoginSchema = z.object({
  credential: z.string().min(10, 'Invalid Google credential'),
});
