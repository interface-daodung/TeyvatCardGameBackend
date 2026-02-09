import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/authorize.js';
import {
  createPaymentLink,
  createPaymentLinkGame,
  getOrderByOrderCode,
} from '../controllers/paymentControllerPayos.js';

export const payosRoutes = Router();

payosRoutes.post('/create-link', authenticate, authorize('admin', 'moderator'), createPaymentLink);
payosRoutes.post('/create-link-game', authenticate, createPaymentLinkGame);
payosRoutes.get('/order/:orderCode', authenticate, getOrderByOrderCode);
