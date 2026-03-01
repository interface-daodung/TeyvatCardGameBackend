import { Response } from 'express';
import { ZodError } from 'zod';
import * as themeService from '../services/themeService.js';
import { AuthRequest } from '../types/index.js';
import { createThemeSchema, updateThemeSchema } from '../validators/theme.js';
import { createAuditLog } from '../utils/auditLog.js';

export const getThemes = async (req: AuthRequest, res: Response) => {
  try {
    const result = await themeService.getThemes();
    res.json(result);
  } catch {
    res.status(500).json({ error: 'Failed to fetch themes' });
  }
};

export const getThemeById = async (req: AuthRequest, res: Response) => {
  try {
    const theme = await themeService.getThemeById(req.params.id);
    if (!theme) return res.status(404).json({ error: 'Theme not found' });
    res.json(theme);
  } catch {
    res.status(500).json({ error: 'Failed to fetch theme' });
  }
};

export const createTheme = async (req: AuthRequest, res: Response) => {
  try {
    const data = createThemeSchema.parse(req.body);
    const theme = await themeService.createTheme(data);
    await createAuditLog(req, 'create_theme', 'Theme', theme._id.toString());
    res.status(201).json(theme);
  } catch (error: unknown) {
    if (error instanceof ZodError) return res.status(400).json({ error: error.errors });
    res.status(500).json({ error: 'Failed to create theme' });
  }
};

export const updateTheme = async (req: AuthRequest, res: Response) => {
  try {
    const data = updateThemeSchema.parse(req.body);
    const theme = await themeService.updateTheme(req.params.id, data);
    if (!theme) return res.status(404).json({ error: 'Theme not found' });
    await createAuditLog(req, 'update_theme', 'Theme', theme._id.toString());
    res.json(theme);
  } catch (error: unknown) {
    if (error instanceof ZodError) return res.status(400).json({ error: error.errors });
    res.status(500).json({ error: 'Failed to update theme' });
  }
};

export const deleteTheme = async (req: AuthRequest, res: Response) => {
  try {
    const theme = await themeService.deleteTheme(req.params.id);
    if (!theme) return res.status(404).json({ error: 'Theme not found' });
    await createAuditLog(req, 'delete_theme', 'Theme', req.params.id);
    res.json({ message: 'Theme deleted successfully' });
  } catch {
    res.status(500).json({ error: 'Failed to delete theme' });
  }
};
