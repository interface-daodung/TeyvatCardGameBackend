import mongoose from 'mongoose';
import { User } from '../models/User.js';

export interface GetUsersFilters {
  page?: number;
  limit?: number;
  search?: string;
  role?: string;
  isBanned?: boolean;
}

export async function getUsers(filters: GetUsersFilters) {
  const rawPage = filters.page ?? 1;
  const rawLimit = filters.limit ?? 20;
  const search = (filters.search ?? '').trim();
  const role = filters.role ?? '';
  const limit = Math.min(500, Math.max(1, rawLimit));

  const query: mongoose.FilterQuery<InstanceType<typeof User>> = {};
  if (search) query.email = { $regex: search, $options: 'i' };
  if (role && ['admin', 'moderator', 'user'].includes(role)) query.role = role as 'admin' | 'moderator' | 'user';
  if (filters.isBanned === true || filters.isBanned === false) query.isBanned = filters.isBanned;

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

  return { users, pagination: { page, limit, total, pages } };
}

export async function getUserById(id: string) {
  const user = await User.findById(id)
    .select('-password')
    .populate('ownedCharacters')
    .populate('ownedEquipment')
    .populate('bannedCards.characters')
    .populate('bannedCards.equipment');
  return user;
}

export async function banUser(userId: string, isBanned: boolean) {
  const user = await User.findById(userId);
  if (!user) return null;
  user.isBanned = isBanned;
  await user.save();
  return user;
}

export async function updateUserXu(userId: string, xu: number) {
  const user = await User.findById(userId);
  if (!user) return null;
  const oldXu = user.xu;
  user.xu = xu;
  await user.save();
  return { user, oldXu };
}

export async function banCard(userId: string, cardId: string, cardType: 'character' | 'equipment') {
  const user = await User.findById(userId);
  if (!user) return null;
  const cardObjectId = new mongoose.Types.ObjectId(cardId);
  const cardArray = cardType === 'character' ? user.bannedCards.characters : user.bannedCards.equipment;
  if (cardArray.some((id) => id.toString() === cardObjectId.toString())) return 'already_banned';
  cardArray.push(cardObjectId);
  await user.save();
  return 'ok';
}

export async function unbanCard(userId: string, cardId: string, cardType: 'character' | 'equipment') {
  const user = await User.findById(userId);
  if (!user) return null;
  const cardObjectId = new mongoose.Types.ObjectId(cardId);
  const cardArray = cardType === 'character' ? user.bannedCards.characters : user.bannedCards.equipment;
  const index = cardArray.findIndex((id) => id.toString() === cardObjectId.toString());
  if (index === -1) return 'not_banned';
  cardArray.splice(index, 1);
  await user.save();
  return 'ok';
}

export async function revokeRefreshToken(userId: string) {
  const user = await User.findById(userId);
  if (!user) return null;
  await User.findByIdAndUpdate(userId, { $set: { refreshToken: null } });
  return { email: user.email };
}
