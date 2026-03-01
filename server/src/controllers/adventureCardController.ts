import { Response } from 'express';
import * as adventureCardService from '../services/adventureCardService.js';
import { AuthRequest } from '../types/index.js';
import { createAdventureCardSchema, updateAdventureCardSchema } from '../validators/gameData.js';
import { createAuditLog } from '../utils/auditLog.js';

export const getAdventureCards = async (req: AuthRequest, res: Response) => {
  try {
    const status = req.query.status as string | undefined;
    const type = req.query.type as string | undefined;
    const result = await adventureCardService.getAdventureCards({ status, type });
    res.json(result);
  } catch {
    res.status(500).json({ error: 'Failed to fetch adventure cards' });
  }
};

export const getAdventureCardById = async (req: AuthRequest, res: Response) => {
  try {
    const card = await adventureCardService.getAdventureCardById(req.params.id);
    if (!card) return res.status(404).json({ error: 'Adventure card not found' });
    res.json(card);
  } catch {
    res.status(500).json({ error: 'Failed to fetch adventure card' });
  }
};

export const createAdventureCard = async (req: AuthRequest, res: Response) => {
  try {
    const data = createAdventureCardSchema.parse(req.body);
    const card = await adventureCardService.createAdventureCard(data);
    await createAuditLog(req, 'create_adventure_card', 'adventure_card', card._id.toString());
    res.status(201).json(card);
  } catch (error: unknown) {
    const err = error as { name?: string; errors?: unknown };
    if (err.name === 'ZodError') return res.status(400).json({ error: err.errors });
    res.status(500).json({ error: 'Failed to create adventure card' });
  }
};

export const updateAdventureCard = async (req: AuthRequest, res: Response) => {
  try {
    const data = updateAdventureCardSchema.parse(req.body);
    const card = await adventureCardService.updateAdventureCard(req.params.id, data);
    if (!card) return res.status(404).json({ error: 'Adventure card not found' });
    await createAuditLog(req, 'update_adventure_card', 'adventure_card', card._id.toString());
    res.json(card);
  } catch (error: unknown) {
    const err = error as { name?: string; errors?: unknown };
    if (err.name === 'ZodError') return res.status(400).json({ error: err.errors });
    res.status(500).json({ error: 'Failed to update adventure card' });
  }
};

export const deleteAdventureCard = async (req: AuthRequest, res: Response) => {
  try {
    const card = await adventureCardService.deleteAdventureCard(req.params.id);
    if (!card) return res.status(404).json({ error: 'Adventure card not found' });
    await createAuditLog(req, 'delete_adventure_card', 'adventure_card', req.params.id);
    res.json({ message: 'Adventure card deleted successfully' });
  } catch {
    res.status(500).json({ error: 'Failed to delete adventure card' });
  }
};
