import { Request, Response } from 'express';
import { verifyAccessToken } from '../utils/jwt.js';
import { notificationManager } from '../utils/notificationManager.js';
import * as notificationService from '../services/notificationService.js';

export const streamNotifications = (req: Request, res: Response) => {
  try {
    const token = req.query.token as string;
    if (!token) return res.status(401).json({ error: 'No token provided' });
    verifyAccessToken(token);
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.setHeader('Access-Control-Allow-Origin', '*');
    if (typeof (res as unknown as { flushHeaders?: () => void }).flushHeaders === 'function') {
      (res as unknown as { flushHeaders: () => void }).flushHeaders();
    }
    notificationManager.addConnection(res);
    req.on('close', () => res.end());
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
};

export const getNotifications = async (req: Request, res: Response) => {
  try {
    const rawPage = parseInt(req.query.page as string) || 1;
    const rawLimit = parseInt(req.query.limit as string) || 50;
    const result = await notificationService.getNotifications({ page: rawPage, limit: rawLimit });
    res.json(result);
  } catch {
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
};
