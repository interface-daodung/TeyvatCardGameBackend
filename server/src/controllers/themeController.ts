import { Response } from 'express';
import { Theme } from '../models/Theme.js';
import { AuthRequest } from '../types/index.js';
import { createThemeSchema, updateThemeSchema } from '../validators/theme.js';
import { createAuditLog } from '../utils/auditLog.js';

export const getThemes = async (req: AuthRequest, res: Response) => {
  try {
    const themes = await Theme.find().sort({ createdAt: -1 });
    res.json({ themes });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch themes' });
  }
};

export const getThemeById = async (req: AuthRequest, res: Response) => {
  try {
    const theme = await Theme.findById(req.params.id);
    if (!theme) {
      return res.status(404).json({ error: 'Theme not found' });
    }
    res.json(theme);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch theme' });
  }
};

export const createTheme = async (req: AuthRequest, res: Response) => {
  try {
    const data = createThemeSchema.parse(req.body);
    const theme = await Theme.create(data);

    await createAuditLog(req, 'create_theme', 'Theme', theme._id.toString());

    res.status(201).json(theme);
  } catch (error: unknown) {
    if (error instanceof Error && error.name === 'ZodError') {
      return res.status(400).json({ error: (error as { errors: unknown }).errors });
    }
    res.status(500).json({ error: 'Failed to create theme' });
  }
};

export const updateTheme = async (req: AuthRequest, res: Response) => {
  try {
    const data = updateThemeSchema.parse(req.body);
    const theme = await Theme.findByIdAndUpdate(req.params.id, data, {
      new: true,
      runValidators: true,
    });

    if (!theme) {
      return res.status(404).json({ error: 'Theme not found' });
    }

    await createAuditLog(req, 'update_theme', 'Theme', theme._id.toString());

    res.json(theme);
  } catch (error: unknown) {
    if (error instanceof Error && error.name === 'ZodError') {
      return res.status(400).json({ error: (error as { errors: unknown }).errors });
    }
    res.status(500).json({ error: 'Failed to update theme' });
  }
};

export const deleteTheme = async (req: AuthRequest, res: Response) => {
  try {
    const theme = await Theme.findByIdAndDelete(req.params.id);
    if (!theme) {
      return res.status(404).json({ error: 'Theme not found' });
    }

    await createAuditLog(req, 'delete_theme', 'Theme', req.params.id);

    res.json({ message: 'Theme deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete theme' });
  }
};
