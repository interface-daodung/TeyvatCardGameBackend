import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/authorize.js';
import {
  getCharacters,
  getCharacterById,
  createCharacter,
  updateCharacter,
  deleteCharacter,
} from '../controllers/characterController.js';

export const characterRoutes = Router();

characterRoutes.use(authenticate);
characterRoutes.use(authorize('admin', 'moderator'));

characterRoutes.get('/', getCharacters);
characterRoutes.get('/:id', getCharacterById);
characterRoutes.post('/', createCharacter);
characterRoutes.patch('/:id', updateCharacter);
characterRoutes.delete('/:id', deleteCharacter);
