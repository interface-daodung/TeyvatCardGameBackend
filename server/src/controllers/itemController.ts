import { Response } from 'express';
import * as itemService from '../services/itemService.js';
import { AuthRequest } from '../types/index.js';
import { updateItemSchema } from '../validators/gameData.js';
import { createAuditLog } from '../utils/auditLog.js';

export const getItems = async (_req: AuthRequest, res: Response) => {
  try {
    const result = await itemService.getItems();
    res.json(result);
  } catch {
    res.status(500).json({ error: 'Failed to fetch items' });
  }
};

export const getItemById = async (req: AuthRequest, res: Response) => {
  try {
    const item = await itemService.getItemById(req.params.id);
    if (!item) return res.status(404).json({ error: 'Item not found' });
    res.json(item);
  } catch {
    res.status(500).json({ error: 'Failed to fetch item' });
  }
};

export const updateItem = async (req: AuthRequest, res: Response) => {
  try {
    const data = updateItemSchema.parse(req.body);
    const item = await itemService.updateItem(req.params.id, data);
    if (!item) return res.status(404).json({ error: 'Item not found' });
    await createAuditLog(req, 'update_item', 'item', item._id.toString());
    res.json(item);
  } catch (error: unknown) {
    const err = error as { name?: string; errors?: unknown };
    if (err.name === 'ZodError') return res.status(400).json({ error: err.errors });
    res.status(500).json({ error: 'Failed to update item' });
  }
};
