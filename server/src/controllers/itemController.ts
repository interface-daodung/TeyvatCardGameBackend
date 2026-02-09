import { Response } from 'express';
import { Item } from '../models/Item.js';
import { AuthRequest } from '../types/index.js';
import { updateItemSchema } from '../validators/gameData.js';
import { createAuditLog } from '../utils/auditLog.js';

export const getItems = async (_req: AuthRequest, res: Response) => {
  try {
    const items = await Item.find().sort({ nameId: 1 });
    res.json({ items });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch items' });
  }
};

export const getItemById = async (req: AuthRequest, res: Response) => {
  try {
    const item = await Item.findById(req.params.id);
    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }
    res.json(item);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch item' });
  }
};

export const updateItem = async (req: AuthRequest, res: Response) => {
  try {
    const data = updateItemSchema.parse(req.body);
    const item = await Item.findByIdAndUpdate(req.params.id, data, {
      new: true,
      runValidators: true,
    });

    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }

    await createAuditLog(req, 'update_item', 'item', item._id.toString());

    res.json(item);
  } catch (error: unknown) {
    const err = error as { name?: string };
    if (err.name === 'ZodError') {
      return res.status(400).json({ error: (error as { errors: unknown }).errors });
    }
    res.status(500).json({ error: 'Failed to update item' });
  }
};
