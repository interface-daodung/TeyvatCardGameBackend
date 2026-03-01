import { Response } from 'express';
import { getCardClassTree } from '../services/cardClassTreeService.js';
import { AuthRequest } from '../types/index.js';

export async function getCardClassTreeHandler(_req: AuthRequest, res: Response) {
  try {
    const tree = getCardClassTree();
    res.json({ tree });
  } catch (error) {
    console.error('getCardClassTree error:', error);
    res.status(500).json({ error: 'Failed to load card class tree' });
  }
}
