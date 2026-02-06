import { Response } from 'express';
import { Equipment } from '../models/Equipment.js';
import { AuthRequest } from '../types/index.js';
import { createEquipmentSchema, updateEquipmentSchema } from '../validators/gameData.js';
import { createAuditLog } from '../utils/auditLog.js';

export const getEquipment = async (req: AuthRequest, res: Response) => {
  try {
    const status = req.query.status as string | undefined;
    const query = status ? { status } : {};

    const equipment = await Equipment.find(query).sort({ createdAt: -1 });
    res.json({ equipment });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch equipment' });
  }
};

export const getEquipmentById = async (req: AuthRequest, res: Response) => {
  try {
    const equipment = await Equipment.findById(req.params.id);
    if (!equipment) {
      return res.status(404).json({ error: 'Equipment not found' });
    }
    res.json(equipment);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch equipment' });
  }
};

export const createEquipment = async (req: AuthRequest, res: Response) => {
  try {
    const data = createEquipmentSchema.parse(req.body);
    const equipment = await Equipment.create(data);

    await createAuditLog(req, 'create_equipment', 'equipment', equipment._id.toString());

    res.status(201).json(equipment);
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: error.errors });
    }
    res.status(500).json({ error: 'Failed to create equipment' });
  }
};

export const updateEquipment = async (req: AuthRequest, res: Response) => {
  try {
    const data = updateEquipmentSchema.parse(req.body);
    const equipment = await Equipment.findByIdAndUpdate(
      req.params.id,
      data,
      { new: true, runValidators: true }
    );

    if (!equipment) {
      return res.status(404).json({ error: 'Equipment not found' });
    }

    await createAuditLog(req, 'update_equipment', 'equipment', equipment._id.toString());

    res.json(equipment);
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: error.errors });
    }
    res.status(500).json({ error: 'Failed to update equipment' });
  }
};

export const deleteEquipment = async (req: AuthRequest, res: Response) => {
  try {
    const equipment = await Equipment.findByIdAndDelete(req.params.id);
    if (!equipment) {
      return res.status(404).json({ error: 'Equipment not found' });
    }

    await createAuditLog(req, 'delete_equipment', 'equipment', req.params.id);

    res.json({ message: 'Equipment deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete equipment' });
  }
};
