import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import {
  login,
  userLogin,
  register,
  refreshToken,
  googleLogin,
  getMe,
  logout,
} from '../controllers/authController.js';

export const authRoutes = Router();

authRoutes.post('/login', login);
authRoutes.post('/login-user', userLogin);
authRoutes.post('/register', register);
authRoutes.post('/google', googleLogin);
authRoutes.get('/me', authenticate, getMe);
authRoutes.post('/refresh', refreshToken);
authRoutes.post('/logout', logout);
