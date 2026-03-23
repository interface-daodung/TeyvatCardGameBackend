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
  countdown: z.number().optional(),
  durabilityMin: z.number().optional(),
  durabilityMax: z.number().optional(),
  foodMin: z.number().optional(),
  foodMax: z.number().optional(),
  hp: z.number().optional(),
  resonanceDescription: z.string().optional(),
  contents: z.array(z.string()).optional(),
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
  map_background: z.string().optional(),
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

// =============================================================
// MapLogic (grid lookup table persistence)
// =============================================================
const mapLogicStatusSchema = z.enum(['draft', 'active']);

export const mapLogicCaseSchema = z.object({
  from: z.number().int().nonnegative(),
  to: z.number().int().nonnegative(),
  chain: z.array(z.number().int().nonnegative()).min(1),
});

export const mapLogicLookupTableSchema = z
  .object({
    width: z.number().int().min(1).max(6),
    height: z.number().int().min(1).max(6),
    cases: z.array(mapLogicCaseSchema),
  })
  .superRefine((val, ctx) => {
    const total = val.width * val.height;
    const maxDirectedEdges = total * 4; // each node max 4 orthogonal neighbors

    if (val.cases.length > maxDirectedEdges) {
      ctx.addIssue({
        code: z.ZodIssueCode.too_big,
        type: 'array',
        maximum: maxDirectedEdges,
        inclusive: true,
        exact: false,
        message: 'lookupTable.cases quá lớn so với width/height',
        path: ['cases'],
      });
    }

    val.cases.forEach((c, i) => {
      if (c.from < 0 || c.from >= total) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'case.from nằm ngoài bounds của grid',
          path: ['cases', i, 'from'],
        });
      }
      if (c.to < 0 || c.to >= total) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'case.to nằm ngoài bounds của grid',
          path: ['cases', i, 'to'],
        });
      }

      c.chain.forEach((nodeIdx, j) => {
        if (nodeIdx < 0 || nodeIdx >= total) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'case.chain có node nằm ngoài bounds của grid',
            path: ['cases', i, 'chain', j],
          });
        }
      });
    });
  });

export const createMapLogicSchema = z
  .object({
    name: z.string().min(1).max(100),
    width: z.number().int().min(1).max(6),
    height: z.number().int().min(1).max(6),
    gridConfig: z.object({
      width: z.number().int().min(1).max(6),
      height: z.number().int().min(1).max(6),
    }),
    lookupTable: mapLogicLookupTableSchema,
    status: mapLogicStatusSchema.optional(),
  })
  .superRefine((val, ctx) => {
    if (val.gridConfig.width !== val.width) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'gridConfig.width phải khớp width',
        path: ['gridConfig', 'width'],
      });
    }
    if (val.gridConfig.height !== val.height) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'gridConfig.height phải khớp height',
        path: ['gridConfig', 'height'],
      });
    }
    if (val.lookupTable.width !== val.width) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'lookupTable.width phải khớp width',
        path: ['lookupTable', 'width'],
      });
    }
    if (val.lookupTable.height !== val.height) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'lookupTable.height phải khớp height',
        path: ['lookupTable', 'height'],
      });
    }
  });

export const updateMapLogicSchema = z
  .object({
    name: z.string().min(1).max(100).optional(),
    width: z.number().int().min(1).max(6).optional(),
    height: z.number().int().min(1).max(6).optional(),
    gridConfig: z
      .object({
        width: z.number().int().min(1).max(6),
        height: z.number().int().min(1).max(6),
      })
      .optional(),
    lookupTable: mapLogicLookupTableSchema.optional(),
    status: mapLogicStatusSchema.optional(),
  })
  .superRefine((val, ctx) => {
    if (val.gridConfig && val.width != null && val.gridConfig.width !== val.width) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'gridConfig.width phải khớp width',
        path: ['gridConfig', 'width'],
      });
    }
    if (val.gridConfig && val.height != null && val.gridConfig.height !== val.height) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'gridConfig.height phải khớp height',
        path: ['gridConfig', 'height'],
      });
    }
    if (val.lookupTable && val.width != null && val.lookupTable.width !== val.width) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'lookupTable.width phải khớp width',
        path: ['lookupTable', 'width'],
      });
    }
    if (val.lookupTable && val.height != null && val.lookupTable.height !== val.height) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'lookupTable.height phải khớp height',
        path: ['lookupTable', 'height'],
      });
    }
  });
