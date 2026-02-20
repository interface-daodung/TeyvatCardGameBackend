import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/authorize.js';
import {
  getServerConfigurationVersions,
  getServerConfigurationVersionById,
  getLatestServerConfigurationVersion,
  syncServerConfigurationVersion,
  checkServerConfigurationUpdate,
} from '../controllers/serverConfigurationVersionController.js';

export const serverConfigurationVersionRoutes = Router();

serverConfigurationVersionRoutes.use(authenticate);
serverConfigurationVersionRoutes.use(authorize('admin', 'moderator'));

serverConfigurationVersionRoutes.get('/', getServerConfigurationVersions);
serverConfigurationVersionRoutes.get('/check', checkServerConfigurationUpdate);
serverConfigurationVersionRoutes.get('/sync', syncServerConfigurationVersion);
serverConfigurationVersionRoutes.get('/latest', getLatestServerConfigurationVersion);
serverConfigurationVersionRoutes.get('/:id', getServerConfigurationVersionById);
