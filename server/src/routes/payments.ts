import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/authorize.js';
import { getPayments, getPaymentById, getPaymentStats, updatePaymentStatus } from '../controllers/paymentController.js';

export const paymentRoutes = Router();

paymentRoutes.use(authenticate);
paymentRoutes.use(authorize('admin', 'moderator'));

paymentRoutes.get('/stats', getPaymentStats);
paymentRoutes.get('/', getPayments);
paymentRoutes.get('/:id', getPaymentById);
paymentRoutes.patch('/:id/status', updatePaymentStatus);