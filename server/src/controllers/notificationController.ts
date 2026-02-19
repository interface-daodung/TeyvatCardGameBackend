import { Request, Response } from 'express';
import { verifyAccessToken } from '../utils/jwt.js';
import { notificationManager } from '../utils/notificationManager.js';
import { Notification } from '../models/Notification.js';
import { AuthRequest } from '../types/index.js';

export const streamNotifications = (req: Request, res: Response) => {
  try {
    const token = req.query.token as string;

    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    verifyAccessToken(token);

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.setHeader('Access-Control-Allow-Origin', '*');

    notificationManager.addConnection(res);

    req.on('close', () => {
      res.end();
    });
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
};

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;

export const getNotifications = async (req: AuthRequest, res: Response) => {
  try {
    const rawPage = parseInt(req.query.page as string) || 1;
    const rawLimit = parseInt(req.query.limit as string) || DEFAULT_LIMIT;
    const limit = Math.min(MAX_LIMIT, Math.max(1, rawLimit));
    const total = await Notification.countDocuments();
    const pages = Math.max(1, Math.ceil(total / limit));
    const page = Math.min(pages, Math.max(1, rawPage));
    const skip = (page - 1) * limit;

    const docs = await Notification.find()
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const notifications = docs.map((d) => ({
      _id: d._id.toString(),
      name: d.name,
      icon: d.icon,
      notif: d.notif,
      path: d.path,
      'data-creation': d.createdAt.toISOString(),
    }));

    res.json({
      notifications,
      pagination: { page, limit, total, pages },
    });
  } catch {
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
};
