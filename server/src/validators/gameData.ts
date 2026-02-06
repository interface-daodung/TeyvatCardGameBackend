import { z } from 'zod';

export const createCharacterSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  stats: z.object({
    attack: z.number().min(0),
    defense: z.number().min(0),
    health: z.number().min(0),
  }),
  status: z.enum(['enabled', 'disabled', 'hidden', 'unreleased']).optional(),
});

export const updateCharacterSchema = createCharacterSchema.partial();

export const createEquipmentSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  slot: z.string().min(1),
  stats: z.object({
    attack: z.number().min(0).optional(),
    defense: z.number().min(0).optional(),
    health: z.number().min(0).optional(),
  }).optional(),
  status: z.enum(['enabled', 'disabled', 'hidden']).optional(),
});

export const updateEquipmentSchema = createEquipmentSchema.partial();

export const createAdventureCardSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  type: z.enum(['situation', 'food', 'monster', 'temporary_weapon']),
  stats: z.object({
    attack: z.number().min(0).optional(),
    defense: z.number().min(0).optional(),
    health: z.number().min(0).optional(),
    effect: z.string().optional(),
  }).optional(),
  appearanceRate: z.number().min(0).max(100),
  status: z.enum(['enabled', 'disabled', 'hidden']).optional(),
});

export const updateAdventureCardSchema = createAdventureCardSchema.partial();

export const createMapSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  deck: z.array(z.string()),
  status: z.enum(['enabled', 'disabled']).optional(),
});

export const updateMapSchema = createMapSchema.partial();
