import { Router } from 'express';
import { testPaymentSuccess } from './testPaymentController.js';

export const testRoutes = Router();

testRoutes.get('/payment-success', testPaymentSuccess);
