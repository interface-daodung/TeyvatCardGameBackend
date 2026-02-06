import { Request, Response } from 'express';
import { verifyAccessToken } from '../utils/jwt.js';
import { notificationManager } from '../utils/notificationManager.js';

export const streamNotifications = (req: Request, res: Response) => {
  try {
    const token = req.query.token as string;
    
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const decoded = verifyAccessToken(token);
    
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.setHeader('Access-Control-Allow-Origin', '*');

    // Đăng ký connection với notification manager
    notificationManager.addConnection(res);

    req.on('close', () => {
      res.end();
    });
  } catch (error) {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
};
