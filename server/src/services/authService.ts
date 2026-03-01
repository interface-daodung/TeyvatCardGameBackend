import bcrypt from 'bcrypt';
import { OAuth2Client } from 'google-auth-library';
import { User } from '../models/User.js';
import { generateAccessToken, generateRefreshToken, verifyAccessToken, verifyRefreshToken } from '../utils/jwt.js';

function getGoogleClientId(): string {
  return process.env.GOOGLE_CLIENT_ID?.trim() || '';
}

export interface LoginResult {
  success: true;
  accessToken: string;
  refreshToken: string;
  user: { id: string; email: string; role: string };
}
export interface LoginFailed {
  success: false;
  code: 'user_not_found' | 'access_denied_role' | 'access_denied_not_user' | 'account_banned' | 'no_password' | 'google_only_account' | 'invalid_password' | 'validation_error' | 'server_error' | 'google_client_id_not_set' | 'google_token_no_email' | 'google_validation_error';
  message?: string;
}
export type LoginResponse = LoginResult | LoginFailed;

export async function loginAdmin(email: string, password: string): Promise<LoginResponse> {
  const user = await User.findOne({ email });
  if (!user) return { success: false, code: 'user_not_found' };
  if (user.role !== 'admin' && user.role !== 'moderator') return { success: false, code: 'access_denied_role' };
  if (!user.password) return { success: false, code: 'no_password' };
  const isValidPassword = await bcrypt.compare(password, user.password);
  if (!isValidPassword) return { success: false, code: 'invalid_password' };

  const tokenPayload = { userId: user._id.toString(), role: user.role, email: user.email };
  const accessToken = generateAccessToken(tokenPayload);
  const refreshToken = generateRefreshToken(tokenPayload);
  await user.updateOne({ $set: { refreshToken } });

  return {
    success: true,
    accessToken,
    refreshToken,
    user: { id: user._id.toString(), email: user.email, role: user.role },
  };
}

export async function loginUser(email: string, password: string): Promise<LoginResponse> {
  const user = await User.findOne({ email });
  if (!user) return { success: false, code: 'user_not_found' };
  if (user.role !== 'user') return { success: false, code: 'access_denied_not_user' };
  if (user.isBanned) return { success: false, code: 'account_banned' };
  if (!user.password) return { success: false, code: 'google_only_account' };
  const isValidPassword = await bcrypt.compare(password, user.password);
  if (!isValidPassword) return { success: false, code: 'invalid_password' };

  const tokenPayload = { userId: user._id.toString(), role: user.role, email: user.email };
  const accessToken = generateAccessToken(tokenPayload);
  const refreshToken = generateRefreshToken(tokenPayload);
  await user.updateOne({ $set: { refreshToken } });

  return {
    success: true,
    accessToken,
    refreshToken,
    user: { id: user._id.toString(), email: user.email, role: user.role },
  };
}

export interface RegisterResult {
  success: true;
  accessToken: string;
  refreshToken: string;
  user: { id: string; email: string; role: string };
}
export interface RegisterFailed {
  success: false;
  code: 'email_exists' | 'validation_error' | 'server_error';
}
export type RegisterResponse = RegisterResult | RegisterFailed;

export async function register(emailNorm: string, password: string): Promise<RegisterResponse> {
  const existing = await User.findOne({ email: emailNorm });
  if (existing) return { success: false, code: 'email_exists' };

  const hashedPassword = await bcrypt.hash(password, 10);
  const user = await User.create({
    email: emailNorm,
    password: hashedPassword,
    role: 'user',
    xu: 0,
  });

  const tokenPayload = { userId: user._id.toString(), role: user.role, email: user.email };
  const accessToken = generateAccessToken(tokenPayload);
  const refreshToken = generateRefreshToken(tokenPayload);
  await user.updateOne({ $set: { refreshToken } });

  return {
    success: true,
    accessToken,
    refreshToken,
    user: { id: user._id.toString(), email: user.email, role: user.role },
  };
}

export interface GoogleLoginResult {
  success: true;
  accessToken: string;
  refreshToken: string;
  user: { id: string; email: string; role: string };
}
export interface GoogleLoginFailed {
  success: false;
  code: 'google_client_id_not_set' | 'google_token_no_email' | 'account_banned' | 'google_validation_error' | 'server_error';
  message?: string;
}
export type GoogleLoginResponse = GoogleLoginResult | GoogleLoginFailed;

export async function googleLogin(credential: string): Promise<GoogleLoginResponse> {
  const googleClientId = getGoogleClientId();
  if (!googleClientId) return { success: false, code: 'google_client_id_not_set' };

  const client = new OAuth2Client(googleClientId);
  const ticket = await client.verifyIdToken({ idToken: credential, audience: googleClientId });
  const payload = ticket.getPayload();
  if (!payload?.email) return { success: false, code: 'google_token_no_email' };

  const email = payload.email.toLowerCase().trim();
  let user = await User.findOne({ email });
  if (!user) {
    user = await User.create({ email, role: 'user', xu: 0 });
  }
  if (user.isBanned) return { success: false, code: 'account_banned' };

  const tokenPayload = { userId: user._id.toString(), role: user.role, email: user.email };
  const accessToken = generateAccessToken(tokenPayload);
  const refreshToken = generateRefreshToken(tokenPayload);
  await user.updateOne({ $set: { refreshToken } });

  return {
    success: true,
    accessToken,
    refreshToken,
    user: { id: user._id.toString(), email: user.email, role: user.role },
  };
}

export async function getMe(userId: string) {
  const user = await User.findById(userId).select('email role lastViewedNotifications').lean();
  return user;
}

export async function patchLastViewedNotifications(userId: string) {
  const now = new Date();
  await User.findByIdAndUpdate(userId, { $set: { lastViewedNotifications: now } });
  return { lastViewedNotifications: now.toISOString() };
}

export async function getSaveGame(userId: string) {
  const user = await User.findById(userId).select('saveGame').lean();
  return user?.saveGame ?? null;
}

export async function putSaveGame(userId: string, saveGame: Record<string, unknown> | null) {
  await User.findByIdAndUpdate(userId, { $set: { saveGame: saveGame ?? null } });
  return { ok: true };
}

export interface RefreshResult {
  success: true;
  accessToken: string;
}
export interface RefreshFailed {
  success: false;
  code: 'no_token' | 'invalid_token';
}
export type RefreshResponse = RefreshResult | RefreshFailed;

export async function refreshToken(token: string): Promise<RefreshResponse> {
  if (!token) return { success: false, code: 'no_token' };
  try {
    const decoded = verifyRefreshToken(token);
    const user = await User.findById(decoded.userId);
    if (!user || user.refreshToken !== token) return { success: false, code: 'invalid_token' };
    const tokenPayload = { userId: user._id.toString(), role: user.role, email: user.email };
    const newAccessToken = generateAccessToken(tokenPayload);
    return { success: true, accessToken: newAccessToken };
  } catch {
    return { success: false, code: 'invalid_token' };
  }
}

export async function logout(token: string | null) {
  if (token) {
    try {
      const decoded = verifyAccessToken(token);
      await User.findByIdAndUpdate(decoded.userId, { $set: { refreshToken: null } });
    } catch {
      // token expired still clear cookies
    }
  }
  return { ok: true };
}
