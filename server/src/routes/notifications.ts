import { Router } from 'express';
import { streamNotifications } from '../controllers/notificationController.js';

export const notificationRoutes = Router();

notificationRoutes.get('/stream', streamNotifications);
