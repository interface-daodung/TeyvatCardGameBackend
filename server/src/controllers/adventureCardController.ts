import { Response } from 'express';
import { AdventureCard } from '../models/AdventureCard.js';
import { AuthRequest } from '../types/index.js';
import { createAdventureCardSchema, updateAdventureCardSchema } from '../validators/gameData.js';
import { createAuditLog } from '../utils/auditLog.js';

export const getAdventureCards = async (req: AuthRequest, res: Response) => {
  try {
    const status = req.query.status as string | undefined;
    const type = req.query.type as string | undefined;
    const query: any = {};
    if (status) query.status = status;
    if (type) query.type = type;

    const cards = await AdventureCard.find(query).sort({ createdAt: -1 });
    res.json({ cards });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch adventure cards' });
  }
};

export const getAdventureCardById = async (req: AuthRequest, res: Response) => {
  try {
    const card = await AdventureCard.findById(req.params.id);
    if (!card) {
      return res.status(404).json({ error: 'Adventure card not found' });
    }
    res.json(card);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch adventure card' });
  }
};

export const createAdventureCard = async (req: AuthRequest, res: Response) => {
  try {
    const data = createAdventureCardSchema.parse(req.body);
    const card = await AdventureCard.create(data);

    await createAuditLog(req, 'create_adventure_card', 'adventure_card', card._id.toString());

    res.status(201).json(card);
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: error.errors });
    }
    res.status(500).json({ error: 'Failed to create adventure card' });
  }
};

export const updateAdventureCard = async (req: AuthRequest, res: Response) => {
  try {
    const data = updateAdventureCardSchema.parse(req.body);
    const card = await AdventureCard.findByIdAndUpdate(
      req.params.id,
      data,
      { new: true, runValidators: true }
    );

    if (!card) {
      return res.status(404).json({ error: 'Adventure card not found' });
    }

    await createAuditLog(req, 'update_adventure_card', 'adventure_card', card._id.toString());

    res.json(card);
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: error.errors });
    }
    res.status(500).json({ error: 'Failed to update adventure card' });
  }
};

export const deleteAdventureCard = async (req: AuthRequest, res: Response) => {
  try {
    const card = await AdventureCard.findByIdAndDelete(req.params.id);
    if (!card) {
      return res.status(404).json({ error: 'Adventure card not found' });
    }

    await createAuditLog(req, 'delete_adventure_card', 'adventure_card', req.params.id);

    res.json({ message: 'Adventure card deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete adventure card' });
  }
};
