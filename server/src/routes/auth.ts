import { Router } from 'express';
import { login, userLogin, refreshToken } from '../controllers/authController.js';

export const authRoutes = Router();

authRoutes.post('/login', login);
authRoutes.post('/login-user', userLogin);
authRoutes.post('/refresh', refreshToken);
