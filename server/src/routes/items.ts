import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/authorize.js';
import { getItems, getItemById, updateItem } from '../controllers/itemController.js';

export const itemRoutes = Router();

itemRoutes.use(authenticate);
itemRoutes.use(authorize('admin', 'moderator'));

itemRoutes.get('/', getItems);
itemRoutes.get('/:id', getItemById);
itemRoutes.patch('/:id', updateItem);
