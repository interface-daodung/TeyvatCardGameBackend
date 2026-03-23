import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/authorize.js';
import {
  applyMigrationOps,
  scanDatabaseStructure,
} from '../controllers/databaseManagementController.js';

export const databaseManagementRoutes = Router();

databaseManagementRoutes.use(authenticate);
databaseManagementRoutes.use(authorize('admin'));

databaseManagementRoutes.post('/scan', scanDatabaseStructure);
databaseManagementRoutes.post('/apply', applyMigrationOps);

