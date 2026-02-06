import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/authorize.js';
import {
  getLocalizations,
  getLocalizationByKey,
  createLocalization,
  updateLocalization,
  getMissingKeys,
} from '../controllers/localizationController.js';

export const localizationRoutes = Router();

localizationRoutes.use(authenticate);
localizationRoutes.use(authorize('admin', 'moderator'));

localizationRoutes.get('/', getLocalizations);
localizationRoutes.get('/missing', getMissingKeys);
localizationRoutes.get('/:key', getLocalizationByKey);
localizationRoutes.post('/', createLocalization);
localizationRoutes.patch('/:key', updateLocalization);
