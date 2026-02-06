import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/authorize.js';
import {
  getEquipment,
  getEquipmentById,
  createEquipment,
  updateEquipment,
  deleteEquipment,
} from '../controllers/equipmentController.js';

export const equipmentRoutes = Router();

equipmentRoutes.use(authenticate);
equipmentRoutes.use(authorize('admin', 'moderator'));

equipmentRoutes.get('/', getEquipment);
equipmentRoutes.get('/:id', getEquipmentById);
equipmentRoutes.post('/', createEquipment);
equipmentRoutes.patch('/:id', updateEquipment);
equipmentRoutes.delete('/:id', deleteEquipment);
