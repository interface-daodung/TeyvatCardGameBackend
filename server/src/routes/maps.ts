import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/authorize.js';
import {
  getMaps,
  getMapById,
  createMap,
  updateMap,
  deleteMap,
} from '../controllers/mapController.js';

export const mapRoutes = Router();

mapRoutes.use(authenticate);
mapRoutes.use(authorize('admin', 'moderator'));

mapRoutes.get('/', getMaps);
mapRoutes.get('/:id', getMapById);
mapRoutes.post('/', createMap);
mapRoutes.patch('/:id', updateMap);
mapRoutes.delete('/:id', deleteMap);
