import { Request } from 'express';
import { JwtPayload } from 'jsonwebtoken';

export interface AuthRequest extends Request {
  user?: JwtPayload & { userId: string; role: string };
}

export type UserRole = 'admin' | 'moderator';

export type PaymentStatus = 'pending' | 'success' | 'failed';

export type CardStatus = 'enabled' | 'disabled' | 'hidden' | 'unreleased';

export type AdventureCardType = 'weapon' | 'enemy' | 'food' | 'trap' | 'treasure' | 'bomb' | 'coin' | 'empty';
