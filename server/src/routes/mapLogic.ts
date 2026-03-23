import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/authorize.js';
import {
  getMapLogics,
  getMapLogicById,
  createMapLogic,
  updateMapLogic,
  deleteMapLogic,
} from '../controllers/mapLogicController.js';

export const mapLogicRoutes = Router();

mapLogicRoutes.use(authenticate);
mapLogicRoutes.use(authorize('admin', 'moderator'));

mapLogicRoutes.get('/', getMapLogics);
mapLogicRoutes.get('/:id', getMapLogicById);
mapLogicRoutes.post('/', createMapLogic);
mapLogicRoutes.patch('/:id', updateMapLogic);
mapLogicRoutes.delete('/:id', deleteMapLogic);

