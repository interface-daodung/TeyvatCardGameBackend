import { Request, Response } from 'express';
import * as authService from '../services/authService.js';
import { loginSchema, googleLoginSchema, registerSchema, saveGameSchema } from '../validators/auth.js';
import { createAuditLog } from '../utils/auditLog.js';
import { AuthRequest } from '../types/index.js';

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
    const result = await authService.loginAdmin(email, password);

    if (!result.success) {
      await createAuditLog(req as AuthRequest, 'login_failed', 'auth', undefined, { email, reason: result.code }, undefined, 'error');
      if (result.code === 'access_denied_role') return res.status(403).json({ error: 'Access denied' });
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    await createAuditLog(
      req as AuthRequest,
      'login',
      'auth',
      result.user.id,
      { email: result.user.email },
      result.user.id,
      'info'
    );

    res.json({
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      user: result.user,
    });
  } catch (error: unknown) {
    const err = error as { name?: string; errors?: unknown };
    if (err.name === 'ZodError') {
      await createAuditLog(req as AuthRequest, 'login_failed', 'auth', undefined, { reason: 'validation_error' }, undefined, 'error');
      return res.status(400).json({ error: err.errors });
    }
    await createAuditLog(req as AuthRequest, 'login_failed', 'auth', undefined, { reason: 'server_error' }, undefined, 'error');
    res.status(500).json({ error: 'Login failed' });
  }
};

export const userLogin = async (req: Request, res: Response) => {
  try {
    const { email, password } = loginSchema.parse(req.body);
    const result = await authService.loginUser(email, password);

    if (!result.success) {
      await createAuditLog(req as AuthRequest, 'login_failed', 'auth', undefined, { email, reason: result.code }, undefined, 'error');
      if (result.code === 'access_denied_not_user') return res.status(403).json({ error: 'Access denied. Admin login at /api/auth/login' });
      if (result.code === 'account_banned') return res.status(403).json({ error: 'Account is banned' });
      if (result.code === 'google_only_account') return res.status(401).json({ error: 'Account uses Google login. Please sign in with Google.' });
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    await createAuditLog(
      req as AuthRequest,
      'login',
      'auth',
      result.user.id,
      { email: result.user.email },
      result.user.id,
      'info'
    );

    res.cookie('jwt', result.accessToken, jwtCookieOptions);
    res.cookie('refreshToken', result.refreshToken, refreshCookieOptions);
    res.json({ user: result.user });
  } catch (error: unknown) {
    const err = error as { name?: string; errors?: unknown };
    if (err.name === 'ZodError') {
      await createAuditLog(req as AuthRequest, 'login_failed', 'auth', undefined, { reason: 'validation_error' }, undefined, 'error');
      return res.status(400).json({ error: err.errors });
    }
    await createAuditLog(req as AuthRequest, 'login_failed', 'auth', undefined, { reason: 'server_error' }, undefined, 'error');
    res.status(500).json({ error: 'Login failed' });
  }
};

export const register = async (req: Request, res: Response) => {
  try {
    const { email, password } = registerSchema.parse(req.body);
    const emailNorm = (email as string).toLowerCase().trim();
    const result = await authService.register(emailNorm, password);

    if (!result.success) {
      if (result.code === 'email_exists') return res.status(409).json({ error: 'Email đã được sử dụng' });
      return res.status(400).json({ error: 'Validation failed' });
    }

    await createAuditLog(
      req as AuthRequest,
      'register',
      'auth',
      result.user.id,
      { email: result.user.email },
      result.user.id,
      'info'
    );

    res.cookie('jwt', result.accessToken, jwtCookieOptions);
    res.cookie('refreshToken', result.refreshToken, refreshCookieOptions);
    res.status(201).json({ user: result.user });
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'name' in error && (error as { name: string }).name === 'ZodError') {
      return res.status(400).json({ error: (error as { errors?: unknown }).errors });
    }
    res.status(500).json({ error: 'Đăng ký thất bại' });
  }
};

export const googleLogin = async (req: Request, res: Response) => {
  const googleClientId = process.env.GOOGLE_CLIENT_ID?.trim() || '';
  try {
    const { credential } = googleLoginSchema.parse(req.body);
    const result = await authService.googleLogin(credential);

    if (!result.success) {
      await createAuditLog(req as AuthRequest, 'login_failed', 'auth', undefined, { reason: result.code }, undefined, 'error');
      if (result.code === 'google_client_id_not_set') {
        return res.status(500).json({
          error: 'Đăng nhập Google thất bại',
          debug: { googleClientId: 'not set', message: 'Server chưa đọc được GOOGLE_CLIENT_ID từ .env' },
        });
      }
      if (result.code === 'google_token_no_email') {
        return res.status(401).json({
          error: 'Đăng nhập Google thất bại',
          debug: { googleClientId: 'loaded', reason: 'token không có email' },
        });
      }
      if (result.code === 'account_banned') {
        return res.status(403).json({
          error: 'Đăng nhập Google thất bại',
          debug: { googleClientId: 'loaded', reason: 'tài khoản bị khóa' },
        });
      }
      return res.status(400).json({
        error: 'Đăng nhập Google thất bại',
        debug: { googleClientId: googleClientId ? 'loaded' : 'not set', reason: 'dữ liệu không hợp lệ' },
      });
    }

    await createAuditLog(
      req as AuthRequest,
      'login',
      'auth',
      result.user.id,
      { email: result.user.email, provider: 'google' },
      result.user.id,
      'info'
    );

    res.cookie('jwt', result.accessToken, jwtCookieOptions);
    res.cookie('refreshToken', result.refreshToken, refreshCookieOptions);
    res.json({ user: result.user });
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'name' in error && (error as Error).name === 'ZodError') {
      await createAuditLog(req as AuthRequest, 'login_failed', 'auth', undefined, { reason: 'google_validation_error' }, undefined, 'error');
      return res.status(400).json({
        error: 'Đăng nhập Google thất bại',
        debug: { googleClientId: googleClientId ? 'loaded' : 'not set', reason: 'dữ liệu không hợp lệ' },
      });
    }
    const message = error instanceof Error ? (error as Error).message : String(error);
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
  if (!authReq.user) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const user = await authService.getMe(authReq.user.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({
      user: {
        id: authReq.user.userId,
        email: user.email,
        role: user.role,
        lastViewedNotifications: user.lastViewedNotifications?.toISOString() ?? null,
      },
    });
  } catch {
    res.status(500).json({ error: 'Failed to get user' });
  }
};

/** PATCH last-viewed-notifications: lưu thời điểm user mở dropdown thông báo (ẩn chấm đỏ). */
export const patchLastViewedNotifications = async (req: Request, res: Response) => {
  const authReq = req as AuthRequest;
  if (!authReq.user) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const data = await authService.patchLastViewedNotifications(authReq.user.userId);
    res.json(data);
  } catch {
    res.status(500).json({ error: 'Failed to update last viewed notifications' });
  }
};

/** GET save-game: trả về saveGame của user hiện tại. */
export const getSaveGame = async (req: Request, res: Response) => {
  const authReq = req as AuthRequest;
  if (!authReq.user) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const saveGame = await authService.getSaveGame(authReq.user.userId);
    await createAuditLog(
      authReq,
      'load_save_game',
      'auth',
      authReq.user.userId,
      { saveGame },
      authReq.user.userId,
      'info'
    );
    res.json({ saveGame });
  } catch {
    res.status(500).json({ error: 'Failed to load save game' });
  }
};

/** PUT save-game: cập nhật saveGame của user hiện tại. */
export const putSaveGame = async (req: Request, res: Response) => {
  const authReq = req as AuthRequest;
  if (!authReq.user) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const { saveGame } = saveGameSchema.parse(req.body);
    await authService.putSaveGame(authReq.user.userId, saveGame ?? null);
    await createAuditLog(
      authReq,
      'save_game',
      'auth',
      authReq.user.userId,
      { saveGame: saveGame ?? null },
      authReq.user.userId,
      'log'
    );
    res.json({ ok: true });
  } catch (error: unknown) {
    const err = error as { name?: string; errors?: unknown };
    if (err.name === 'ZodError') return res.status(400).json({ error: err.errors });
    res.status(500).json({ error: 'Failed to save game' });
  }
};

/** Refresh: đọc refreshToken từ cookie hoặc body (SPA), kiểm tra với DB, cấp jwt mới. */
export const refreshToken = async (req: Request, res: Response) => {
  try {
    const token = req.cookies?.refreshToken ?? (req.body as { refreshToken?: string })?.refreshToken;
    const result = await authService.refreshToken(token);

    if (!result.success) {
      if (result.code === 'no_token') return res.status(401).json({ error: 'Refresh token required' });
      return res.status(403).json({ error: 'Invalid token' });
    }

    res.cookie('jwt', result.accessToken, jwtCookieOptions);
    res.json({ ok: true, accessToken: result.accessToken });
  } catch {
    res.status(401).json({ error: 'Invalid refresh token' });
  }
};

/** Logout: xóa cookie và refreshToken trong DB (nếu có jwt hợp lệ). */
export const logout = async (req: Request, res: Response) => {
  const token = req.cookies?.jwt ?? (req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.slice(7) : null);
  await authService.logout(token);
  res.clearCookie('jwt', { httpOnly: true, sameSite: 'lax', path: '/' });
  res.clearCookie('refreshToken', { httpOnly: true, sameSite: 'lax', path: '/', maxAge: 0 });
  res.json({ ok: true });
};
