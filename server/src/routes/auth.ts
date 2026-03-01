import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import {
  login,
  userLogin,
  register,
  refreshToken,
  googleLogin,
  getMe,
  patchLastViewedNotifications,
  getSaveGame,
  putSaveGame,
  logout,
} from '../controllers/authController.js';

export const authRoutes = Router();

authRoutes.post('/login', login);
authRoutes.post('/login-user', userLogin);
authRoutes.post('/register', register);
authRoutes.post('/google', googleLogin);
authRoutes.get('/me', authenticate, getMe);
authRoutes.patch('/last-viewed-notifications', authenticate, patchLastViewedNotifications);
authRoutes.get('/save-game', authenticate, getSaveGame);
authRoutes.put('/save-game', authenticate, putSaveGame);
authRoutes.post('/refresh', refreshToken);
authRoutes.post('/logout', logout);
