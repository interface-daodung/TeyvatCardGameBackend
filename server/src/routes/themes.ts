import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/authorize.js';
import {
  getThemes,
  getThemeById,
  createTheme,
  updateTheme,
  deleteTheme,
} from '../controllers/themeController.js';

export const themeRoutes = Router();

themeRoutes.use(authenticate);
themeRoutes.use(authorize('admin', 'moderator'));

themeRoutes.get('/', getThemes);
themeRoutes.get('/:id', getThemeById);
themeRoutes.post('/', createTheme);
themeRoutes.patch('/:id', updateTheme);
themeRoutes.delete('/:id', deleteTheme);
