import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/authorize.js';
import {
  getUsers,
  getUserById,
  banUser,
  updateUserXu,
  banCard,
  unbanCard,
} from '../controllers/userController.js';

export const userRoutes = Router();

userRoutes.use(authenticate);
userRoutes.use(authorize('admin', 'moderator'));

userRoutes.get('/', getUsers);
userRoutes.get('/:id', getUserById);
userRoutes.patch('/:id/ban', banUser);
userRoutes.patch('/:id/xu', updateUserXu);
userRoutes.post('/:id/ban-card', banCard);
userRoutes.post('/:id/unban-card', unbanCard);
