import { Response } from 'express';
import { Character } from '../models/Character.js';
import { AuthRequest } from '../types/index.js';
import { createCharacterSchema, updateCharacterSchema } from '../validators/gameData.js';
import { createAuditLog } from '../utils/auditLog.js';

export const getCharacters = async (req: AuthRequest, res: Response) => {
  try {
    const status = req.query.status as string | undefined;
    const query = status ? { status } : {};

    const characters = await Character.find(query).sort({ createdAt: -1 });
    res.json({ characters });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch characters' });
  }
};

export const getCharacterById = async (req: AuthRequest, res: Response) => {
  try {
    const character = await Character.findById(req.params.id);
    if (!character) {
      return res.status(404).json({ error: 'Character not found' });
    }
    res.json(character);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch character' });
  }
};

export const createCharacter = async (req: AuthRequest, res: Response) => {
  try {
    const data = createCharacterSchema.parse(req.body);
    const character = await Character.create(data);

    await createAuditLog(req, 'create_character', 'character', character._id.toString());

    res.status(201).json(character);
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: error.errors });
    }
    res.status(500).json({ error: 'Failed to create character' });
  }
};

export const updateCharacter = async (req: AuthRequest, res: Response) => {
  try {
    const data = updateCharacterSchema.parse(req.body);
    const character = await Character.findByIdAndUpdate(
      req.params.id,
      data,
      { new: true, runValidators: true }
    );

    if (!character) {
      return res.status(404).json({ error: 'Character not found' });
    }

    await createAuditLog(req, 'update_character', 'character', character._id.toString());

    res.json(character);
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: error.errors });
    }
    res.status(500).json({ error: 'Failed to update character' });
  }
};

export const deleteCharacter = async (req: AuthRequest, res: Response) => {
  try {
    const character = await Character.findByIdAndDelete(req.params.id);
    if (!character) {
      return res.status(404).json({ error: 'Character not found' });
    }

    await createAuditLog(req, 'delete_character', 'character', req.params.id);

    res.json({ message: 'Character deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete character' });
  }
};
