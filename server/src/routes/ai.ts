import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/authorize.js';
import { chatWithAi } from '../controllers/aiController.js';

export const aiRoutes = Router();

aiRoutes.use(authenticate);
aiRoutes.use(authorize('admin', 'moderator'));

aiRoutes.post('/chat', chatWithAi);

