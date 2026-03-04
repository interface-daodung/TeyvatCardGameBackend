import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../utils/jwt.js';
import { AuthRequest } from '../types/index.js';
import { User } from '../models/User.js';

export const authenticate = async (req: Request, res: Response, next: NextFunction) => {
  try {
    let token: string | undefined;
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    } else if (req.cookies?.jwt) {
      token = req.cookies.jwt;
    }
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const decoded = verifyAccessToken(token);

    const user = await User.findById(decoded.userId).select('isBanned role email');
    if (!user || user.isBanned) {
      return res.status(403).json({ error: 'Account is banned' });
    }

    (req as AuthRequest).user = {
      userId: decoded.userId,
      role: decoded.role,
      email: decoded.email,
    };

    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};
