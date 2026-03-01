import { Response } from 'express';
import * as dashboardService from '../services/dashboardService.js';
import { AuthRequest } from '../types/index.js';

export const getDashboardStats = async (req: AuthRequest, res: Response) => {
  try {
    const result = await dashboardService.getDashboardStats();
    res.json(result);
  } catch (error: unknown) {
    const err = error as { message?: string };
    console.error('Dashboard stats error:', err);
    res.status(500).json({
      error: 'Failed to fetch dashboard stats',
      message: process.env.NODE_ENV === 'development' ? err?.message : undefined,
    });
  }
};
