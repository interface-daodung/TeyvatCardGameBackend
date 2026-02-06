import { z } from 'zod';

export const createLocalizationSchema = z.object({
  key: z.string().min(1),
  values: z.record(z.string()),
});

export const updateLocalizationSchema = z.object({
  values: z.record(z.string()),
});
