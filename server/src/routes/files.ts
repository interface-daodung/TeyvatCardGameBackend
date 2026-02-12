import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/authorize.js';
import { getImageTreeHandler } from '../controllers/filesController.js';

export const filesRoutes = Router();

filesRoutes.use(authenticate);
filesRoutes.use(authorize('admin', 'moderator'));

filesRoutes.get('/image-tree', getImageTreeHandler);
