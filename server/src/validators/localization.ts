import { z } from 'zod';

export const createLocalizationSchema = z.object({
  key: z.string().min(1),
  translations: z.record(z.string()).default({}),
});

export const updateLocalizationSchema = z.object({
  translations: z.record(z.string()).optional(),
});
