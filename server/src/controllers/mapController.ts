import { Response } from 'express';
import mongoose from 'mongoose';
import { Map } from '../models/Map.js';
import { AuthRequest } from '../types/index.js';
import { createMapSchema, updateMapSchema } from '../validators/gameData.js';
import { createAuditLog } from '../utils/auditLog.js';

export const getMaps = async (req: AuthRequest, res: Response) => {
  try {
    const status = req.query.status as string | undefined;
    const query = status ? { status } : {};

    const maps = await Map.find(query).populate('deck').sort({ createdAt: -1 });
    res.json({ maps });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch maps' });
  }
};

export const getMapById = async (req: AuthRequest, res: Response) => {
  try {
    const map = await Map.findById(req.params.id).populate('deck');
    if (!map) {
      return res.status(404).json({ error: 'Map not found' });
    }
    res.json(map);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch map' });
  }
};

export const createMap = async (req: AuthRequest, res: Response) => {
  try {
    const data = createMapSchema.parse(req.body);
    const deck = data.deck.map((id) => new mongoose.Types.ObjectId(id));

    const map = await Map.create({
      ...data,
      deck,
    });

    await createAuditLog(req, 'create_map', 'map', map._id.toString());

    const populatedMap = await Map.findById(map._id).populate('deck');
    res.status(201).json(populatedMap);
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: error.errors });
    }
    res.status(500).json({ error: 'Failed to create map' });
  }
};

export const updateMap = async (req: AuthRequest, res: Response) => {
  try {
    const data = updateMapSchema.parse(req.body);
    const updateData: any = { ...data };

    if (data.deck) {
      updateData.deck = data.deck.map((id) => new mongoose.Types.ObjectId(id));
    }

    const map = await Map.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).populate('deck');

    if (!map) {
      return res.status(404).json({ error: 'Map not found' });
    }

    await createAuditLog(req, 'update_map', 'map', map._id.toString());

    res.json(map);
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: error.errors });
    }
    res.status(500).json({ error: 'Failed to update map' });
  }
};

export const deleteMap = async (req: AuthRequest, res: Response) => {
  try {
    const map = await Map.findByIdAndDelete(req.params.id);
    if (!map) {
      return res.status(404).json({ error: 'Map not found' });
    }

    await createAuditLog(req, 'delete_map', 'map', req.params.id);

    res.json({ message: 'Map deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete map' });
  }
};
