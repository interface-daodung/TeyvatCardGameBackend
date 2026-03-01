import { Response } from 'express';
import * as mapService from '../services/mapService.js';
import { AuthRequest } from '../types/index.js';
import { createMapSchema, updateMapSchema } from '../validators/gameData.js';
import { createAuditLog } from '../utils/auditLog.js';

export const getMaps = async (req: AuthRequest, res: Response) => {
  try {
    const status = req.query.status as string | undefined;
    const result = await mapService.getMaps(status);
    res.json(result);
  } catch {
    res.status(500).json({ error: 'Failed to fetch maps' });
  }
};

export const getMapById = async (req: AuthRequest, res: Response) => {
  try {
    const map = await mapService.getMapById(req.params.id);
    if (!map) return res.status(404).json({ error: 'Map not found' });
    res.json(map);
  } catch {
    res.status(500).json({ error: 'Failed to fetch map' });
  }
};

export const createMap = async (req: AuthRequest, res: Response) => {
  try {
    const data = createMapSchema.parse(req.body);
    const map = await mapService.createMap(data);
    if (!map) return res.status(500).json({ error: 'Failed to create map' });
    await createAuditLog(req, 'create_map', 'map', map._id.toString());
    res.status(201).json(map);
  } catch (error: unknown) {
    const err = error as { name?: string; errors?: unknown };
    if (err.name === 'ZodError') return res.status(400).json({ error: err.errors });
    res.status(500).json({ error: 'Failed to create map' });
  }
};

export const updateMap = async (req: AuthRequest, res: Response) => {
  try {
    const data = updateMapSchema.parse(req.body);
    const map = await mapService.updateMap(req.params.id, data);
    if (!map) return res.status(404).json({ error: 'Map not found' });
    await createAuditLog(req, 'update_map', 'map', map._id.toString());
    res.json(map);
  } catch (error: unknown) {
    const err = error as { name?: string; errors?: unknown };
    if (err.name === 'ZodError') return res.status(400).json({ error: err.errors });
    res.status(500).json({ error: 'Failed to update map' });
  }
};

export const deleteMap = async (req: AuthRequest, res: Response) => {
  try {
    const map = await mapService.deleteMap(req.params.id);
    if (!map) return res.status(404).json({ error: 'Map not found' });
    await createAuditLog(req, 'delete_map', 'map', req.params.id);
    res.json({ message: 'Map deleted successfully' });
  } catch {
    res.status(500).json({ error: 'Failed to delete map' });
  }
};
