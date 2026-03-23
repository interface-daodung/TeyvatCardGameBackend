import { Response } from 'express';
import * as mapLogicService from '../services/mapLogicService.js';
import { AuthRequest } from '../types/index.js';
import { createMapLogicSchema, updateMapLogicSchema } from '../validators/gameData.js';
import { createAuditLog } from '../utils/auditLog.js';

export const getMapLogics = async (req: AuthRequest, res: Response) => {
  try {
    const status = req.query.status as string | undefined;
    const result = await mapLogicService.getMapLogics(status);
    res.json(result);
  } catch {
    res.status(500).json({ error: 'Failed to fetch map logics' });
  }
};

export const getMapLogicById = async (req: AuthRequest, res: Response) => {
  try {
    const mapLogic = await mapLogicService.getMapLogicById(req.params.id);
    if (!mapLogic) return res.status(404).json({ error: 'Map logic not found' });
    res.json(mapLogic);
  } catch {
    res.status(500).json({ error: 'Failed to fetch map logic' });
  }
};

export const createMapLogic = async (req: AuthRequest, res: Response) => {
  try {
    const data = createMapLogicSchema.parse(req.body);
    const mapLogic = await mapLogicService.createMapLogic(data);
    if (!mapLogic) return res.status(500).json({ error: 'Failed to create map logic' });
    await createAuditLog(req, 'create_map_logic', 'map_logic', mapLogic._id.toString());
    res.status(201).json(mapLogic);
  } catch (error: unknown) {
    const err = error as { name?: string; errors?: unknown };
    if (err.name === 'ZodError') return res.status(400).json({ error: err.errors });
    res.status(500).json({ error: 'Failed to create map logic' });
  }
};

export const updateMapLogic = async (req: AuthRequest, res: Response) => {
  try {
    const data = updateMapLogicSchema.parse(req.body);
    const mapLogic = await mapLogicService.updateMapLogic(req.params.id, data);
    if (!mapLogic) return res.status(404).json({ error: 'Map logic not found' });
    await createAuditLog(req, 'update_map_logic', 'map_logic', mapLogic._id.toString());
    res.json(mapLogic);
  } catch (error: unknown) {
    const err = error as { name?: string; errors?: unknown };
    if (err.name === 'ZodError') return res.status(400).json({ error: err.errors });
    res.status(500).json({ error: 'Failed to update map logic' });
  }
};

export const deleteMapLogic = async (req: AuthRequest, res: Response) => {
  try {
    const mapLogic = await mapLogicService.deleteMapLogic(req.params.id);
    if (!mapLogic) return res.status(404).json({ error: 'Map logic not found' });
    await createAuditLog(req, 'delete_map_logic', 'map_logic', req.params.id);
    res.json({ message: 'Map logic deleted successfully' });
  } catch {
    res.status(500).json({ error: 'Failed to delete map logic' });
  }
};

