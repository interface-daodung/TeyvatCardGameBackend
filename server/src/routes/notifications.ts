import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/authorize.js';
import { streamNotifications, getNotifications } from '../controllers/notificationController.js';

export const notificationRoutes = Router();

notificationRoutes.get('/stream', streamNotifications);

notificationRoutes.get('/', authenticate, authorize('admin', 'moderator'), getNotifications);
