import { Response } from 'express';
import mongoose from 'mongoose';
import { User } from '../models/User.js';
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

    const limit = Math.min(500, Math.max(1, rawLimit));

    const query: mongoose.FilterQuery<InstanceType<typeof User>> = {};
    if (search) {
      query.email = { $regex: search, $options: 'i' };
    }
    if (role && ['admin', 'moderator', 'user'].includes(role)) {
      query.role = role;
    }
    if (isBannedRaw === 'true' || isBannedRaw === 'false') {
      query.isBanned = isBannedRaw === 'true';
    }

    const total = await User.countDocuments(query);
    const pages = Math.max(1, Math.ceil(total / limit));
    const page = Math.min(pages, Math.max(1, rawPage));
    const skip = (page - 1) * limit;

    const users = await User.find(query)
      .select('-password')
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 })
      .lean();

    res.json({
      users,
      pagination: {
        page,
        limit,
        total,
        pages,
      },
    });
  } catch (error: any) {
    console.error('getUsers error:', error?.message || error);
    res.status(500).json({
      error: 'Failed to fetch users',
      message: process.env.NODE_ENV === 'development' ? error?.message : undefined,
    });
  }
};

export const getUserById = async (req: AuthRequest, res: Response) => {
  try {
    const user = await User.findById(req.params.id)
      .select('-password')
      .populate('ownedCharacters')
      .populate('ownedEquipment')
      .populate('bannedCards.characters')
      .populate('bannedCards.equipment');

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch user' });
  }
};

export const banUser = async (req: AuthRequest, res: Response) => {
  try {
    const { isBanned } = banUserSchema.parse(req.body);
    const userId = req.params.id;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    user.isBanned = isBanned;
    await user.save();

    await createAuditLog(req, 'ban_user', 'user', userId, { isBanned });

    res.json({ message: `User ${isBanned ? 'banned' : 'unbanned'} successfully` });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: error.errors });
    }
    res.status(500).json({ error: 'Failed to update user ban status' });
  }
};

export const updateUserXu = async (req: AuthRequest, res: Response) => {
  try {
    const { xu } = updateUserXuSchema.parse(req.body);
    const userId = req.params.id;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const oldXu = user.xu;
    user.xu = xu;
    await user.save();

    await createAuditLog(req, 'update_currency', 'user', userId, {
      oldXu,
      newXu: xu,
    });

    res.json({ message: 'User currency updated', xu: user.xu });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: error.errors });
    }
    res.status(500).json({ error: 'Failed to update user currency' });
  }
};

export const banCard = async (req: AuthRequest, res: Response) => {
  try {
    const { cardId, cardType } = banCardSchema.parse(req.body);
    const userId = req.params.id;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const cardObjectId = new mongoose.Types.ObjectId(cardId);
    const cardArray = cardType === 'character' 
      ? user.bannedCards.characters 
      : user.bannedCards.equipment;

    if (cardArray.includes(cardObjectId)) {
      return res.status(400).json({ error: 'Card already banned' });
    }

    cardArray.push(cardObjectId);
    await user.save();

    await createAuditLog(req, 'ban_card', 'user', userId, { cardId, cardType });

    res.json({ message: 'Card banned successfully' });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: error.errors });
    }
    res.status(500).json({ error: 'Failed to ban card' });
  }
};

export const unbanCard = async (req: AuthRequest, res: Response) => {
  try {
    const { cardId, cardType } = banCardSchema.parse(req.body);
    const userId = req.params.id;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const cardObjectId = new mongoose.Types.ObjectId(cardId);
    const cardArray = cardType === 'character' 
      ? user.bannedCards.characters 
      : user.bannedCards.equipment;

    const index = cardArray.findIndex(
      (id) => id.toString() === cardObjectId.toString()
    );

    if (index === -1) {
      return res.status(400).json({ error: 'Card not banned' });
    }

    cardArray.splice(index, 1);
    await user.save();

    await createAuditLog(req, 'unban_card', 'user', userId, { cardId, cardType });

    res.json({ message: 'Card unbanned successfully' });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: error.errors });
    }
    res.status(500).json({ error: 'Failed to unban card' });
  }
};

/** Thu hồi refresh token của user (accessToken vẫn có hiệu lực đến khi hết hạn, không thu hồi ngay). */
export const revokeRefreshToken = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.params.id;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    await User.findByIdAndUpdate(userId, { $set: { refreshToken: null } });
    await createAuditLog(req, 'revoke_refresh_token', 'user', userId, { email: user.email }, undefined, 'info');

    res.json({ message: 'Refresh token revoked. User will be logged out when access token expires.' });
  } catch (error: any) {
    console.error('revokeRefreshToken error:', error?.message || error);
    res.status(500).json({ error: 'Failed to revoke refresh token' });
  }
};
