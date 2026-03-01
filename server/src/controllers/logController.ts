import { Response } from 'express';
import * as logService from '../services/logService.js';
import { AuthRequest } from '../types/index.js';

export const getLogs = async (req: AuthRequest, res: Response) => {
  try {
    const rawPage = parseInt(req.query.page as string) || 1;
    const rawLimit = parseInt(req.query.limit as string) || 20;
    const action = req.query.action as string | undefined;
    const resource = req.query.resource as string | undefined;
    const content = req.query.content as 'info' | 'log' | 'error' | undefined;
    const email = (req.query.email as string)?.trim();

    const result = await logService.getLogs({
      page: rawPage,
      limit: rawLimit,
      action,
      resource,
      content,
      email,
    });
    res.json(result);
  } catch {
    res.status(500).json({ error: 'Failed to fetch logs' });
  }
};

export const getLogById = async (req: AuthRequest, res: Response) => {
  try {
    const log = await logService.getLogById(req.params.id);
    if (!log) return res.status(404).json({ error: 'Log not found' });
    res.json(log);
  } catch {
    res.status(500).json({ error: 'Failed to fetch log' });
  }
};
