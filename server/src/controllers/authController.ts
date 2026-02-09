import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import { OAuth2Client } from 'google-auth-library';
import { User } from '../models/User.js';
import { generateAccessToken, generateRefreshToken } from '../utils/jwt.js';
import { loginSchema, googleLoginSchema } from '../validators/auth.js';
import { createAuditLog } from '../utils/auditLog.js';
import { AuthRequest } from '../types/index.js';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = loginSchema.parse(req.body);

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Only allow admin/moderator login
    if (user.role !== 'admin' && user.role !== 'moderator') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const tokenPayload = {
      userId: user._id.toString(),
      role: user.role,
      email: user.email,
    };

    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);

    await createAuditLog(
      req as AuthRequest,
      'login',
      'auth',
      user._id.toString(),
      { email: user.email },
      user._id.toString()
    );

    res.json({
      accessToken,
      refreshToken,
      user: {
        id: user._id.toString(),
        email: user.email,
        role: user.role,
      },
    });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: error.errors });
    }
    res.status(500).json({ error: 'Login failed' });
  }
};

export const userLogin = async (req: Request, res: Response) => {
  try {
    const { email, password } = loginSchema.parse(req.body);

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    if (user.role !== 'user') {
      return res.status(403).json({ error: 'Access denied. Admin login at /api/auth/login' });
    }

    if (user.isBanned) {
      return res.status(403).json({ error: 'Account is banned' });
    }

    if (!user.password) {
      return res.status(401).json({ error: 'Account uses Google login. Please sign in with Google.' });
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const tokenPayload = {
      userId: user._id.toString(),
      role: user.role,
      email: user.email,
    };

    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);

    await createAuditLog(
      req as AuthRequest,
      'login',
      'auth',
      user._id.toString(),
      { email: user.email },
      user._id.toString()
    );

    res.json({
      accessToken,
      refreshToken,
      user: {
        id: user._id.toString(),
        email: user.email,
        role: user.role,
      },
    });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: error.errors });
    }
    res.status(500).json({ error: 'Login failed' });
  }
};

export const googleLogin = async (req: Request, res: Response) => {
  try {
    const { credential } = googleLoginSchema.parse(req.body);

    if (!GOOGLE_CLIENT_ID) {
      return res.status(500).json({ error: 'Google OAuth not configured' });
    }

    const client = new OAuth2Client(GOOGLE_CLIENT_ID);
    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    if (!payload?.email) {
      return res.status(401).json({ error: 'Invalid Google credential' });
    }

    const email = payload.email.toLowerCase().trim();
    let user = await User.findOne({ email });

    if (!user) {
      user = await User.create({
        email,
        role: 'user',
        xu: 0,
      });
    }

    if (user.isBanned) {
      return res.status(403).json({ error: 'Account is banned' });
    }

    const tokenPayload = {
      userId: user._id.toString(),
      role: user.role,
      email: user.email,
    };

    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);

    await createAuditLog(
      req as AuthRequest,
      'login',
      'auth',
      user._id.toString(),
      { email: user.email, provider: 'google' },
      user._id.toString()
    );

    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
      maxAge: 15 * 60 * 1000,
    };
    res.cookie('jwt', accessToken, cookieOptions);

    res.json({
      accessToken,
      refreshToken,
      user: {
        id: user._id.toString(),
        email: user.email,
        role: user.role,
      },
    });
  } catch (error: unknown) {
    if (error instanceof Error && error.name === 'ZodError') {
      return res.status(400).json({ error: (error as { errors?: unknown }).errors });
    }
    res.status(401).json({ error: 'Google login failed' });
  }
};

export const refreshToken = async (req: Request, res: Response) => {
  try {
    const { refreshToken: token } = req.body;

    if (!token) {
      return res.status(400).json({ error: 'Refresh token required' });
    }

    const { verifyRefreshToken } = await import('../utils/jwt.js');
    const decoded = verifyRefreshToken(token);

    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(403).json({ error: 'Invalid token' });
    }

    const tokenPayload = {
      userId: user._id.toString(),
      role: user.role,
      email: user.email,
    };

    const { generateAccessToken } = await import('../utils/jwt.js');
    const newAccessToken = generateAccessToken(tokenPayload);

    res.json({ accessToken: newAccessToken });
  } catch (error) {
    res.status(401).json({ error: 'Invalid refresh token' });
  }
};
