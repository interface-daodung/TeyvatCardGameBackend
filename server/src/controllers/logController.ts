import { Response } from 'express';
import mongoose from 'mongoose';
import { AuditLog } from '../models/AuditLog.js';
import { User } from '../models/User.js';
import { AuthRequest } from '../types/index.js';

export const getLogs = async (req: AuthRequest, res: Response) => {
  try {
    const rawPage = parseInt(req.query.page as string) || 1;
    const rawLimit = parseInt(req.query.limit as string) || 20;
    const action = req.query.action as string | undefined;
    const resource = req.query.resource as string | undefined;
    const content = req.query.content as 'info' | 'log' | 'error' | undefined;
    const email = (req.query.email as string)?.trim();
    const query: Record<string, unknown> = {};
    if (action) query.action = action;
    if (resource) query.resource = resource;
    if (content === 'info' || content === 'log' || content === 'error') query.content = content;
    if (email) {
      const users = await User.find({ email: new RegExp(email, 'i') }).select('_id').lean();
      const ids = users.map((u) => u._id);
      query.adminId = { $in: ids };
    }

    const limit = Math.min(100, Math.max(1, rawLimit));
    const total = await AuditLog.countDocuments(query);
    const pages = Math.max(1, Math.ceil(total / limit));
    const page = Math.min(pages, Math.max(1, rawPage));
    const skip = (page - 1) * limit;

    const logs = await AuditLog.find(query)
      .populate('adminId', 'email')
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });

    res.json({
      logs,
      pagination: {
        page,
        limit,
        total,
        pages,
      },
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch logs' });
  }
};

export const getLogById = async (req: AuthRequest, res: Response) => {
  try {
    const log = await AuditLog.findById(req.params.id).populate('adminId', 'email');
    if (!log) {
      return res.status(404).json({ error: 'Log not found' });
    }
    res.json(log);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch log' });
  }
};
