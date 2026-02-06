import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/authorize.js';
import { getLogs, getLogById } from '../controllers/logController.js';
import { getDashboardStats } from '../controllers/dashboardController.js';

export const logRoutes = Router();

logRoutes.use(authenticate);
logRoutes.use(authorize('admin', 'moderator'));

logRoutes.get('/dashboard', getDashboardStats);
logRoutes.get('/', getLogs);
logRoutes.get('/:id', getLogById);
