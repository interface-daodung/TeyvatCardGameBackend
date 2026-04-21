import { z } from 'zod';

export const banUserSchema = z.object({
  isBanned: z.boolean(),
});

export const updateUserXuSchema = z.object({
  xu: z.number().min(0),
});

export const banCardSchema = z.object({
  cardId: z.string(),
  cardType: z.enum(['character']),
});

export const changeUserPasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(6, 'Password must be at least 6 characters'),
});
