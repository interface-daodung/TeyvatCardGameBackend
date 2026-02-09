import { Router } from 'express';
import { login, userLogin, refreshToken, googleLogin } from '../controllers/authController.js';

export const authRoutes = Router();

authRoutes.post('/login', login);
authRoutes.post('/login-user', userLogin);
authRoutes.post('/google', googleLogin);
authRoutes.post('/refresh', refreshToken);
