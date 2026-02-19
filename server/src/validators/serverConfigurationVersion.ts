import { z } from 'zod';

const versionSchema = z.object({
  major: z.number().int().min(0),
  minor: z.number().int().min(0),
  patch: z.number().int().min(0),
});

/** Cho phép JSON tùy ý cho từng phần configuration */
const configurationSchema = z.object({
  CardsData: z.record(z.unknown()).nullable().optional(),
  MapsData: z.record(z.unknown()).nullable().optional(),
  CharacterData: z.record(z.unknown()).nullable().optional(),
  themeData: z.record(z.unknown()).nullable().optional(),
  itemData: z.record(z.unknown()).nullable().optional(),
  localizations: z
    .object({
      en: z.record(z.unknown()).nullable().optional(),
      vi: z.record(z.unknown()).nullable().optional(),
      ja: z.record(z.unknown()).nullable().optional(),
    })
    .optional(),
});

export const createServerConfigurationVersionSchema = z.object({
  version: versionSchema.optional(),
  configuration: configurationSchema.optional(),
});

export const updateServerConfigurationVersionSchema = z.object({
  version: versionSchema.partial().optional(),
  configuration: configurationSchema.optional(),
});
