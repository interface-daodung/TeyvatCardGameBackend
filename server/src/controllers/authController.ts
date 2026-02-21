import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import { OAuth2Client } from 'google-auth-library';
import { User } from '../models/User.js';
import { generateAccessToken, generateRefreshToken } from '../utils/jwt.js';
import { loginSchema, googleLoginSchema, registerSchema } from '../validators/auth.js';
import { createAuditLog } from '../utils/auditLog.js';
import { AuthRequest } from '../types/index.js';

/** Đọc tại runtime để tránh load trước dotenv trong index.ts */
function getGoogleClientId(): string {
  return process.env.GOOGLE_CLIENT_ID?.trim() || '';
}

const jwtCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  maxAge: 15 * 60 * 1000, // 15 minutes
};

const refreshCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
};

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = loginSchema.parse(req.body);

    const user = await User.findOne({ email });
    if (!user) {
      await createAuditLog(req as AuthRequest, 'login_failed', 'auth', undefined, { email, reason: 'user_not_found' }, undefined, 'error');
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Only allow admin/moderator login
    if (user.role !== 'admin' && user.role !== 'moderator') {
      await createAuditLog(req as AuthRequest, 'login_failed', 'auth', undefined, { email, reason: 'access_denied_role' }, undefined, 'error');
      return res.status(403).json({ error: 'Access denied' });
    }

    if (!user.password) {
      await createAuditLog(req as AuthRequest, 'login_failed', 'auth', undefined, { email, reason: 'no_password' }, undefined, 'error');
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      await createAuditLog(req as AuthRequest, 'login_failed', 'auth', undefined, { email, reason: 'invalid_password' }, undefined, 'error');
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const tokenPayload = {
      userId: user._id.toString(),
      role: user.role,
      email: user.email,
    };

    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);

    await user.updateOne({ $set: { refreshToken } });

    await createAuditLog(
      req as AuthRequest,
      'login',
      'auth',
      user._id.toString(),
      { email: user.email },
      user._id.toString(),
      'info'
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
      await createAuditLog(req as AuthRequest, 'login_failed', 'auth', undefined, { reason: 'validation_error' }, undefined, 'error');
      return res.status(400).json({ error: error.errors });
    }
    await createAuditLog(req as AuthRequest, 'login_failed', 'auth', undefined, { reason: 'server_error' }, undefined, 'error');
    res.status(500).json({ error: 'Login failed' });
  }
};

export const userLogin = async (req: Request, res: Response) => {
  try {
    const { email, password } = loginSchema.parse(req.body);

    const user = await User.findOne({ email });
    if (!user) {
      await createAuditLog(req as AuthRequest, 'login_failed', 'auth', undefined, { email, reason: 'user_not_found' }, undefined, 'error');
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    if (user.role !== 'user') {
      await createAuditLog(req as AuthRequest, 'login_failed', 'auth', undefined, { email, reason: 'access_denied_not_user' }, undefined, 'error');
      return res.status(403).json({ error: 'Access denied. Admin login at /api/auth/login' });
    }

    if (user.isBanned) {
      await createAuditLog(req as AuthRequest, 'login_failed', 'auth', undefined, { email, reason: 'account_banned' }, undefined, 'error');
      return res.status(403).json({ error: 'Account is banned' });
    }

    if (!user.password) {
      await createAuditLog(req as AuthRequest, 'login_failed', 'auth', undefined, { email, reason: 'google_only_account' }, undefined, 'error');
      return res.status(401).json({ error: 'Account uses Google login. Please sign in with Google.' });
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      await createAuditLog(req as AuthRequest, 'login_failed', 'auth', undefined, { email, reason: 'invalid_password' }, undefined, 'error');
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const tokenPayload = {
      userId: user._id.toString(),
      role: user.role,
      email: user.email,
    };

    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);

    await user.updateOne({ $set: { refreshToken } });

    await createAuditLog(
      req as AuthRequest,
      'login',
      'auth',
      user._id.toString(),
      { email: user.email },
      user._id.toString(),
      'info'
    );

    res.cookie('jwt', accessToken, jwtCookieOptions);
    res.cookie('refreshToken', refreshToken, refreshCookieOptions);
    res.json({
      user: {
        id: user._id.toString(),
        email: user.email,
        role: user.role,
      },
    });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      await createAuditLog(req as AuthRequest, 'login_failed', 'auth', undefined, { reason: 'validation_error' }, undefined, 'error');
      return res.status(400).json({ error: error.errors });
    }
    await createAuditLog(req as AuthRequest, 'login_failed', 'auth', undefined, { reason: 'server_error' }, undefined, 'error');
    res.status(500).json({ error: 'Login failed' });
  }
};

export const register = async (req: Request, res: Response) => {
  try {
    const { email, password } = registerSchema.parse(req.body);
    const emailNorm = (email as string).toLowerCase().trim();

    const existing = await User.findOne({ email: emailNorm });
    if (existing) {
      return res.status(409).json({ error: 'Email đã được sử dụng' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({
      email: emailNorm,
      password: hashedPassword,
      role: 'user',
      xu: 0,
    });

    const tokenPayload = {
      userId: user._id.toString(),
      role: user.role,
      email: user.email,
    };

    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);

    await user.updateOne({ $set: { refreshToken } });

    await createAuditLog(
      req as AuthRequest,
      'register',
      'auth',
      user._id.toString(),
      { email: user.email },
      user._id.toString(),
      'info'
    );

    res.cookie('jwt', accessToken, jwtCookieOptions);
    res.cookie('refreshToken', refreshToken, refreshCookieOptions);
    res.status(201).json({
      user: {
        id: user._id.toString(),
        email: user.email,
        role: user.role,
      },
    });
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'name' in error && (error as { name: string }).name === 'ZodError') {
      return res.status(400).json({ error: (error as { errors?: unknown }).errors });
    }
    res.status(500).json({ error: 'Đăng ký thất bại' });
  }
};

export const googleLogin = async (req: Request, res: Response) => {
  const googleClientId = getGoogleClientId();
  try {
    const { credential } = googleLoginSchema.parse(req.body);

    if (!googleClientId) {
      await createAuditLog(req as AuthRequest, 'login_failed', 'auth', undefined, { reason: 'google_client_id_not_set' }, undefined, 'error');
      return res.status(500).json({
        error: 'Đăng nhập Google thất bại',
        debug: { googleClientId: 'not set', message: 'Server chưa đọc được GOOGLE_CLIENT_ID từ .env' },
      });
    }

    const client = new OAuth2Client(googleClientId);
    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: googleClientId,
    });
    const payload = ticket.getPayload();
    if (!payload?.email) {
      await createAuditLog(req as AuthRequest, 'login_failed', 'auth', undefined, { reason: 'google_token_no_email' }, undefined, 'error');
      return res.status(401).json({
        error: 'Đăng nhập Google thất bại',
        debug: { googleClientId: 'loaded', reason: 'token không có email' },
      });
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
      await createAuditLog(req as AuthRequest, 'login_failed', 'auth', user._id.toString(), { email: user.email, reason: 'account_banned' }, undefined, 'error');
      return res.status(403).json({
        error: 'Đăng nhập Google thất bại',
        debug: { googleClientId: 'loaded', reason: 'tài khoản bị khóa' },
      });
    }

    const tokenPayload = {
      userId: user._id.toString(),
      role: user.role,
      email: user.email,
    };

    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);

    await user.updateOne({ $set: { refreshToken } });

    await createAuditLog(
      req as AuthRequest,
      'login',
      'auth',
      user._id.toString(),
      { email: user.email, provider: 'google' },
      user._id.toString(),
      'info'
    );

    res.cookie('jwt', accessToken, jwtCookieOptions);
    res.cookie('refreshToken', refreshToken, refreshCookieOptions);
    res.json({
      user: {
        id: user._id.toString(),
        email: user.email,
        role: user.role,
      },
    });
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'name' in error && (error as Error).name === 'ZodError') {
      await createAuditLog(req as AuthRequest, 'login_failed', 'auth', undefined, { reason: 'google_validation_error' }, undefined, 'error');
      return res.status(400).json({
        error: 'Đăng nhập Google thất bại',
        debug: { googleClientId: googleClientId ? 'loaded' : 'not set', reason: 'dữ liệu không hợp lệ' },
      });
    }
    const message = error instanceof Error ? error.message : String(error);
    console.error('Google login failed:', message);
    await createAuditLog(req as AuthRequest, 'login_failed', 'auth', undefined, { reason: message.substring(0, 80) }, undefined, 'error');
    return res.status(401).json({
      error: 'Đăng nhập Google thất bại',
      debug: { googleClientId: googleClientId ? 'loaded' : 'not set', reason: message.substring(0, 80) },
    });
  }
};

/** Xác thực user qua cookie jwt (dùng cho client check đã đăng nhập chưa). JS không đọc được token. */
export const getMe = async (req: Request, res: Response) => {
  const authReq = req as AuthRequest;
  if (!authReq.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const { userId, email, role } = authReq.user;
  res.json({ user: { id: userId, email, role } });
};

/** Refresh: đọc refreshToken từ cookie hoặc body (SPA), kiểm tra với DB, cấp jwt mới. */
export const refreshToken = async (req: Request, res: Response) => {
  try {
    const token = req.cookies?.refreshToken ?? (req.body as { refreshToken?: string })?.refreshToken;
    if (!token) {
      return res.status(401).json({ error: 'Refresh token required' });
    }

    const { verifyRefreshToken } = await import('../utils/jwt.js');
    const decoded = verifyRefreshToken(token);

    const user = await User.findById(decoded.userId);
    if (!user || user.refreshToken !== token) {
      return res.status(403).json({ error: 'Invalid token' });
    }

    const tokenPayload = {
      userId: user._id.toString(),
      role: user.role,
      email: user.email,
    };

    const { generateAccessToken } = await import('../utils/jwt.js');
    const newAccessToken = generateAccessToken(tokenPayload);

    res.cookie('jwt', newAccessToken, jwtCookieOptions);
    res.json({ ok: true, accessToken: newAccessToken });
  } catch (error) {
    res.status(401).json({ error: 'Invalid refresh token' });
  }
};

/** Logout: xóa cookie và refreshToken trong DB (nếu có jwt hợp lệ). Nhận token từ cookie hoặc Authorization (SPA admin). */
export const logout = async (req: Request, res: Response) => {
  const token = req.cookies?.jwt ?? (req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.slice(7) : null);
  if (token) {
    try {
      const { verifyAccessToken } = await import('../utils/jwt.js');
      const decoded = verifyAccessToken(token);
      await User.findByIdAndUpdate(decoded.userId, { $set: { refreshToken: null } });
    } catch {
      // token hết hạn vẫn xóa cookie
    }
  }
  res.clearCookie('jwt', { httpOnly: true, sameSite: 'lax', path: '/' });
  res.clearCookie('refreshToken', { httpOnly: true, sameSite: 'lax', path: '/', maxAge: 0 });
  res.json({ ok: true });
};
