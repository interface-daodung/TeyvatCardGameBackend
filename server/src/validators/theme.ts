import { z } from 'zod';

const hexColor = z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Màu phải là hex (vd: #95245b)');

export const themeColorsSchema = z.object({
  primary: hexColor,
  secondary: hexColor,
  accent: hexColor,
  neutral: hexColor,
  background: hexColor,
  surface: hexColor,
  text: hexColor,
});

export const themeAssetsSchema = z.object({
  background: z.string().min(1, 'Background image không được để trống'),
  icons: z.object({
    compass: z.string().min(1, 'Icon compass không được để trống'),
    equip: z.string().min(1, 'Icon equip không được để trống'),
    library: z.string().min(1, 'Icon library không được để trống'),
  }),
});

export const createThemeSchema = z.object({
  name: z.string().min(1, 'Tên theme không được để trống').trim(),
  colors: themeColorsSchema,
  assets: themeAssetsSchema.optional(),
});

export const updateThemeSchema = z.object({
  name: z.string().min(1).trim().optional(),
  colors: themeColorsSchema.partial().optional(),
  assets: themeAssetsSchema
    .extend({
      icons: themeAssetsSchema.shape.icons.partial(),
    })
    .partial()
    .optional(),
});
