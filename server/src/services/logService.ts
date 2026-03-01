import { AuditLog } from '../models/AuditLog.js';
import { User } from '../models/User.js';

export interface GetLogsParams {
  page?: number;
  limit?: number;
  action?: string;
  resource?: string;
  content?: 'info' | 'log' | 'error';
  email?: string;
}

export async function getLogs(params: GetLogsParams) {
  const rawPage = params.page ?? 1;
  const rawLimit = params.limit ?? 20;
  const limit = Math.min(100, Math.max(1, rawLimit));
  const query: Record<string, unknown> = {};
  if (params.action) query.action = params.action;
  if (params.resource) query.resource = params.resource;
  if (params.content === 'info' || params.content === 'log' || params.content === 'error') query.content = params.content;
  if (params.email?.trim()) {
    const users = await User.find({ email: new RegExp(params.email!.trim(), 'i') }).select('_id').lean();
    query.adminId = { $in: users.map((u) => u._id) };
  }

  const total = await AuditLog.countDocuments(query);
  const pages = Math.max(1, Math.ceil(total / limit));
  const page = Math.min(pages, Math.max(1, rawPage));
  const skip = (page - 1) * limit;

  const logs = await AuditLog.find(query)
    .populate('adminId', 'email')
    .skip(skip)
    .limit(limit)
    .sort({ createdAt: -1 });

  return { logs, pagination: { page, limit, total, pages } };
}

export async function getLogById(id: string) {
  const log = await AuditLog.findById(id).populate('adminId', 'email');
  return log;
}
