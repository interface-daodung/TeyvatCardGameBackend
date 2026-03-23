import { AuditLog } from '../models/AuditLog.js';
import { User } from '../models/User.js';

export interface GetLogsParams {
  page?: number;
  limit?: number;
  action?: string;
  resource?: string;
  content?: 'info' | 'log' | 'error';
  email?: string;
  /** Lọc theo `details.sessionId` (lịch sử một phiên chat AI). */
  sessionId?: string;
  /** Chỉ log của user đang đăng nhập (cần kèm viewerUserId). */
  mineOnly?: boolean;
  viewerUserId?: string;
}

export async function getLogs(params: GetLogsParams) {
  const rawPage = params.page ?? 1;
  const rawLimit = params.limit ?? 20;
  const limit = Math.min(100, Math.max(1, rawLimit));
  const query: Record<string, unknown> = {};
  if (params.action) query.action = params.action;
  if (params.resource) query.resource = params.resource;
  if (params.content === 'info' || params.content === 'log' || params.content === 'error') query.content = params.content;
  if (params.mineOnly && params.viewerUserId) {
    query.adminId = params.viewerUserId;
  } else if (params.email?.trim()) {
    const users = await User.find({ email: new RegExp(params.email!.trim(), 'i') }).select('_id').lean();
    query.adminId = { $in: users.map((u) => u._id) };
  }

  if (params.sessionId?.trim()) {
    query['details.sessionId'] = params.sessionId.trim();
  }

  const total = await AuditLog.countDocuments(query);
  const pages = Math.max(1, Math.ceil(total / limit));
  const page = Math.min(pages, Math.max(1, rawPage));
  const skip = (page - 1) * limit;

  const sortCreatedAt = params.sessionId?.trim() ? 1 : -1;

  const logs = await AuditLog.find(query)
    .populate('adminId', 'email')
    .skip(skip)
    .limit(limit)
    .sort({ createdAt: sortCreatedAt });

  return { logs, pagination: { page, limit, total, pages } };
}

export async function getLogById(id: string) {
  const log = await AuditLog.findById(id).populate('adminId', 'email');
  return log;
}
