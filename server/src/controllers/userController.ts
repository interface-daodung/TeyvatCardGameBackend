import { Response } from 'express';
import * as userService from '../services/userService.js';
import { AuthRequest } from '../types/index.js';
import { banUserSchema, updateUserXuSchema, banCardSchema } from '../validators/users.js';
import { createAuditLog } from '../utils/auditLog.js';

export const getUsers = async (req: AuthRequest, res: Response) => {
  try {
    const rawPage = parseInt(req.query.page as string) || 1;
    const rawLimit = parseInt(req.query.limit as string) || 20;
    const search = (req.query.search as string)?.trim() || '';
    const role = (req.query.role as string) || '';
    const isBannedRaw = req.query.isBanned as string | undefined;
    const isBanned = isBannedRaw === 'true' ? true : isBannedRaw === 'false' ? false : undefined;

    const result = await userService.getUsers({
      page: rawPage,
      limit: rawLimit,
      search,
      role,
      isBanned,
    });
    res.json(result);
  } catch (error: unknown) {
    const err = error as { message?: string };
    console.error('getUsers error:', err?.message || error);
    res.status(500).json({
      error: 'Failed to fetch users',
      message: process.env.NODE_ENV === 'development' ? err?.message : undefined,
    });
  }
};

export const getUserById = async (req: AuthRequest, res: Response) => {
  try {
    const user = await userService.getUserById(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch {
    res.status(500).json({ error: 'Failed to fetch user' });
  }
};

export const banUser = async (req: AuthRequest, res: Response) => {
  try {
    const { isBanned } = banUserSchema.parse(req.body);
    const user = await userService.banUser(req.params.id, isBanned);
    if (!user) return res.status(404).json({ error: 'User not found' });
    await createAuditLog(req, 'ban_user', 'user', req.params.id, { isBanned });
    res.json({ message: `User ${isBanned ? 'banned' : 'unbanned'} successfully` });
  } catch (error: unknown) {
    const err = error as { name?: string; errors?: unknown };
    if (err.name === 'ZodError') return res.status(400).json({ error: err.errors });
    res.status(500).json({ error: 'Failed to update user ban status' });
  }
};

export const updateUserXu = async (req: AuthRequest, res: Response) => {
  try {
    const { xu } = updateUserXuSchema.parse(req.body);
    const result = await userService.updateUserXu(req.params.id, xu);
    if (!result) return res.status(404).json({ error: 'User not found' });
    await createAuditLog(req, 'update_currency', 'user', req.params.id, {
      oldXu: result.oldXu,
      newXu: xu,
    });
    res.json({ message: 'User currency updated', xu: result.user.xu });
  } catch (error: unknown) {
    const err = error as { name?: string; errors?: unknown };
    if (err.name === 'ZodError') return res.status(400).json({ error: err.errors });
    res.status(500).json({ error: 'Failed to update user currency' });
  }
};

export const banCard = async (req: AuthRequest, res: Response) => {
  try {
    const { cardId, cardType } = banCardSchema.parse(req.body);
    const result = await userService.banCard(req.params.id, cardId, cardType);
    if (!result) return res.status(404).json({ error: 'User not found' });
    if (result === 'already_banned') return res.status(400).json({ error: 'Card already banned' });
    await createAuditLog(req, 'ban_card', 'user', req.params.id, { cardId, cardType });
    res.json({ message: 'Card banned successfully' });
  } catch (error: unknown) {
    const err = error as { name?: string; errors?: unknown };
    if (err.name === 'ZodError') return res.status(400).json({ error: err.errors });
    res.status(500).json({ error: 'Failed to ban card' });
  }
};

export const unbanCard = async (req: AuthRequest, res: Response) => {
  try {
    const { cardId, cardType } = banCardSchema.parse(req.body);
    const result = await userService.unbanCard(req.params.id, cardId, cardType);
    if (!result) return res.status(404).json({ error: 'User not found' });
    if (result === 'not_banned') return res.status(400).json({ error: 'Card not banned' });
    await createAuditLog(req, 'unban_card', 'user', req.params.id, { cardId, cardType });
    res.json({ message: 'Card unbanned successfully' });
  } catch (error: unknown) {
    const err = error as { name?: string; errors?: unknown };
    if (err.name === 'ZodError') return res.status(400).json({ error: err.errors });
    res.status(500).json({ error: 'Failed to unban card' });
  }
};

export const revokeRefreshToken = async (req: AuthRequest, res: Response) => {
  try {
    const result = await userService.revokeRefreshToken(req.params.id);
    if (!result) return res.status(404).json({ error: 'User not found' });
    await createAuditLog(req, 'revoke_refresh_token', 'user', req.params.id, { email: result.email }, undefined, 'info');
    res.json({ message: 'Refresh token revoked. User will be logged out when access token expires.' });
  } catch (error: unknown) {
    const err = error as { message?: string };
    console.error('revokeRefreshToken error:', err?.message || error);
    res.status(500).json({ error: 'Failed to revoke refresh token' });
  }
};
