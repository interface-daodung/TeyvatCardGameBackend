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

export const createThemeSchema = z.object({
  name: z.string().min(1, 'Tên theme không được để trống').trim(),
  colors: themeColorsSchema,
});

export const updateThemeSchema = z.object({
  name: z.string().min(1).trim().optional(),
  colors: themeColorsSchema.partial().optional(),
});
