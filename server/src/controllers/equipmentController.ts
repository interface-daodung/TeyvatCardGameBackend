import { Response } from 'express';
import * as equipmentService from '../services/equipmentService.js';
import { AuthRequest } from '../types/index.js';
import { createEquipmentSchema, updateEquipmentSchema } from '../validators/gameData.js';
import { createAuditLog } from '../utils/auditLog.js';

export const getEquipment = async (req: AuthRequest, res: Response) => {
  try {
    const status = req.query.status as string | undefined;
    const result = await equipmentService.getEquipment(status);
    res.json(result);
  } catch {
    res.status(500).json({ error: 'Failed to fetch equipment' });
  }
};

export const getEquipmentById = async (req: AuthRequest, res: Response) => {
  try {
    const equipment = await equipmentService.getEquipmentById(req.params.id);
    if (!equipment) return res.status(404).json({ error: 'Equipment not found' });
    res.json(equipment);
  } catch {
    res.status(500).json({ error: 'Failed to fetch equipment' });
  }
};

export const createEquipment = async (req: AuthRequest, res: Response) => {
  try {
    const data = createEquipmentSchema.parse(req.body);
    const equipment = await equipmentService.createEquipment(data);
    await createAuditLog(req, 'create_equipment', 'equipment', equipment._id.toString());
    res.status(201).json(equipment);
  } catch (error: unknown) {
    const err = error as { name?: string; errors?: unknown };
    if (err.name === 'ZodError') return res.status(400).json({ error: err.errors });
    res.status(500).json({ error: 'Failed to create equipment' });
  }
};

export const updateEquipment = async (req: AuthRequest, res: Response) => {
  try {
    const data = updateEquipmentSchema.parse(req.body);
    const equipment = await equipmentService.updateEquipment(req.params.id, data);
    if (!equipment) return res.status(404).json({ error: 'Equipment not found' });
    await createAuditLog(req, 'update_equipment', 'equipment', equipment._id.toString());
    res.json(equipment);
  } catch (error: unknown) {
    const err = error as { name?: string; errors?: unknown };
    if (err.name === 'ZodError') return res.status(400).json({ error: err.errors });
    res.status(500).json({ error: 'Failed to update equipment' });
  }
};

export const deleteEquipment = async (req: AuthRequest, res: Response) => {
  try {
    const equipment = await equipmentService.deleteEquipment(req.params.id);
    if (!equipment) return res.status(404).json({ error: 'Equipment not found' });
    await createAuditLog(req, 'delete_equipment', 'equipment', req.params.id);
    res.json({ message: 'Equipment deleted successfully' });
  } catch {
    res.status(500).json({ error: 'Failed to delete equipment' });
  }
};
