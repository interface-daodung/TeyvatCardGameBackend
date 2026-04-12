import { Request } from 'express';
import { JwtPayload } from 'jsonwebtoken';

export type { IAttached } from './attached.js';
export { AttachedSchema } from './attached.js';

export interface AuthRequest extends Request {
  user?: JwtPayload & { userId: string; role: string; email: string };
}

export type UserRole = 'admin' | 'moderator';

export type PaymentStatus = 'pending' | 'success' | 'failed';

export type CardStatus = 'enabled' | 'disabled' | 'unreleased';

export type AdventureCardType = 'weapon' | 'enemy' | 'food' | 'trap' | 'treasure' | 'bomb' | 'coin' | 'empty';
