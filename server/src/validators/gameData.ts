import { z } from 'zod';

const characterLevelStatSchema = z.object({
  level: z.number().min(1),
  price: z.number().min(0),
});

const elementEnum = z.enum(['anemo', 'cryo', 'dendro', 'electro', 'geo', 'hydro', 'pyro', 'none']);

export const createCharacterSchema = z.object({
  nameId: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  element: elementEnum.optional(),
  HP: z.number().min(1).optional(),
  maxLevel: z.number().min(1).max(99).optional(),
  status: z.enum(['enabled', 'disabled', 'hidden', 'unreleased']).optional(),
  levelStats: z.array(characterLevelStatSchema).optional(),
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
  nameId: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  type: z.enum(['weapon', 'enemy', 'food', 'trap', 'treasure', 'bomb', 'coin', 'empty']),
  category: z.string().optional(),
  element: z.string().optional(),
  clan: z.string().optional(),
  rarity: z.number().min(1).max(5).optional(),
  className: z.string().optional(),
  image: z.string().optional(),
  status: z.enum(['enabled', 'disabled', 'hidden']).optional(),
  // Additional fields based on type
  healthMin: z.number().optional(),
  healthMax: z.number().optional(),
  scoreMin: z.number().optional(),
  scoreMax: z.number().optional(),
  damageMin: z.number().optional(),
  damageMax: z.number().optional(),
  damage: z.number().optional(),
  countdown: z.number().optional(),
  durabilityMin: z.number().optional(),
  durabilityMax: z.number().optional(),
  foodMin: z.number().optional(),
  foodMax: z.number().optional(),
  food: z.number().optional(),
  hp: z.number().optional(),
  resonanceDescription: z.string().optional(),
});

export const updateAdventureCardSchema = createAdventureCardSchema.partial();

const mapTypeRatiosSchema = z.object({
  enemies: z.number().min(0).optional(),
  food: z.number().min(0).optional(),
  weapons: z.number().min(0).optional(),
  coins: z.number().min(0).optional(),
  traps: z.number().min(0).optional(),
  treasures: z.number().min(0).optional(),
  bombs: z.number().min(0).optional(),
});

export const createMapSchema = z.object({
  nameId: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  typeRatios: mapTypeRatiosSchema.optional(),
  deck: z.array(z.string()),
  status: z.enum(['enabled', 'disabled', 'hidden']).optional(),
});

export const updateMapSchema = createMapSchema.partial();

const levelStatSchema = z.object({
  power: z.number().min(0),
  cooldown: z.number().min(0),
  price: z.number().min(0),
});

export const createItemSchema = z.object({
  nameId: z.string().min(1),
  basePower: z.number().min(0, "Base Power không được nhỏ hơn 0").max(50, "Base Power không được vượt quá 50"),
  baseCooldown: z.number().min(0, "Base Cooldown không được nhỏ hơn 0").max(50, "Base Cooldown không được vượt quá 50"),
  maxLevel: z.number().min(1, "Max Level tối thiểu là 1").max(99, "Max Level tối đa là 99").optional(),
  levelStats: z.array(levelStatSchema).optional(),
});

export const updateItemSchema = z.object({
  basePower: z.number().min(0, "Base Power không được nhỏ hơn 0").max(50, "Base Power không được vượt quá 50").optional(),
  baseCooldown: z.number().min(0, "Base Cooldown không được nhỏ hơn 0").max(50, "Base Cooldown không được vượt quá 50").optional(),
  maxLevel: z.number().min(1, "Max Level tối thiểu là 1").max(99, "Max Level tối đa là 99").optional(),
  levelStats: z.array(levelStatSchema).optional(),
});
