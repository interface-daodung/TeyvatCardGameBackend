import { z } from 'zod';

export const banUserSchema = z.object({
  isBanned: z.boolean(),
});

export const updateUserXuSchema = z.object({
  xu: z.number().min(0),
});

export const banCardSchema = z.object({
  cardId: z.string(),
  cardType: z.enum(['character', 'equipment']),
});
