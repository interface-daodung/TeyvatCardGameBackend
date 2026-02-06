import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/authorize.js';
import {
  getAdventureCards,
  getAdventureCardById,
  createAdventureCard,
  updateAdventureCard,
  deleteAdventureCard,
} from '../controllers/adventureCardController.js';

export const adventureCardRoutes = Router();

adventureCardRoutes.use(authenticate);
adventureCardRoutes.use(authorize('admin', 'moderator'));

adventureCardRoutes.get('/', getAdventureCards);
adventureCardRoutes.get('/:id', getAdventureCardById);
adventureCardRoutes.post('/', createAdventureCard);
adventureCardRoutes.patch('/:id', updateAdventureCard);
adventureCardRoutes.delete('/:id', deleteAdventureCard);
