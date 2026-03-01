import { Response } from 'express';
import * as characterService from '../services/characterService.js';
import { AuthRequest } from '../types/index.js';
import { createCharacterSchema, updateCharacterSchema } from '../validators/gameData.js';
import { createAuditLog } from '../utils/auditLog.js';

export const getCharacters = async (req: AuthRequest, res: Response) => {
  try {
    const status = req.query.status as string | undefined;
    const result = await characterService.getCharacters(status);
    res.json(result);
  } catch {
    res.status(500).json({ error: 'Failed to fetch characters' });
  }
};

export const getCharacterById = async (req: AuthRequest, res: Response) => {
  try {
    const character = await characterService.getCharacterById(req.params.id);
    if (!character) return res.status(404).json({ error: 'Character not found' });
    res.json(character);
  } catch {
    res.status(500).json({ error: 'Failed to fetch character' });
  }
};

export const createCharacter = async (req: AuthRequest, res: Response) => {
  try {
    const data = createCharacterSchema.parse(req.body);
    const character = await characterService.createCharacter(data);
    await createAuditLog(req, 'create_character', 'character', character._id.toString());
    res.status(201).json(character);
  } catch (error: unknown) {
    const err = error as { name?: string; errors?: unknown };
    if (err.name === 'ZodError') return res.status(400).json({ error: err.errors });
    res.status(500).json({ error: 'Failed to create character' });
  }
};

export const updateCharacter = async (req: AuthRequest, res: Response) => {
  try {
    const data = updateCharacterSchema.parse(req.body);
    const character = await characterService.updateCharacter(req.params.id, data);
    if (!character) return res.status(404).json({ error: 'Character not found' });
    await createAuditLog(req, 'update_character', 'character', character._id.toString());
    res.json(character);
  } catch (error: unknown) {
    const err = error as { name?: string; errors?: unknown };
    if (err.name === 'ZodError') return res.status(400).json({ error: err.errors });
    res.status(500).json({ error: 'Failed to update character' });
  }
};

export const deleteCharacter = async (req: AuthRequest, res: Response) => {
  try {
    const character = await characterService.deleteCharacter(req.params.id);
    if (!character) return res.status(404).json({ error: 'Character not found' });
    await createAuditLog(req, 'delete_character', 'character', req.params.id);
    res.json({ message: 'Character deleted successfully' });
  } catch {
    res.status(500).json({ error: 'Failed to delete character' });
  }
};
