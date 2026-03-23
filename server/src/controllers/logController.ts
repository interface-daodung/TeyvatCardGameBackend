import { Response } from 'express';
import * as logService from '../services/logService.js';
import { AuthRequest } from '../types/index.js';
import { AuditLog } from '../models/AuditLog.js';

export const getLogs = async (req: AuthRequest, res: Response) => {
  try {
    const rawPage = parseInt(req.query.page as string) || 1;
    const rawLimit = parseInt(req.query.limit as string) || 20;
    const action = req.query.action as string | undefined;
    const resource = req.query.resource as string | undefined;
    const content = req.query.content as 'info' | 'log' | 'error' | undefined;
    const email = (req.query.email as string)?.trim();
    const sessionId = (req.query.sessionId as string)?.trim();
    const mineOnly =
      String(req.query.mineOnly ?? '').toLowerCase() === 'true' ||
      req.query.mineOnly === '1';

    const result = await logService.getLogs({
      page: rawPage,
      limit: rawLimit,
      action,
      resource,
      content,
      email,
      sessionId: sessionId || undefined,
      mineOnly: mineOnly || undefined,
      viewerUserId: mineOnly ? req.user?.userId : undefined,
    });
    res.json(result);
  } catch {
    res.status(500).json({ error: 'Failed to fetch logs' });
  }
};

export const getLogById = async (req: AuthRequest, res: Response) => {
  try {
    const log = await logService.getLogById(req.params.id);
    if (!log) return res.status(404).json({ error: 'Log not found' });
    res.json(log);
  } catch {
    res.status(500).json({ error: 'Failed to fetch log' });
  }
};

/** Người gọi AI (JWT): gán adminId + email trong details để log không trống adminId. */
export type AiLogActor = { adminId: string; email: string };

export async function logAiInfo(details: Record<string, unknown>, actor?: AiLogActor) {
  try {
    await AuditLog.create({
      ...(actor ? { adminId: actor.adminId } : {}),
      action: 'ai_info',
      resource: 'ai_controller',
      content: 'info',
      details: actor ? { email: actor.email, ...details } : details,
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Failed to write AI info log', err);
  }
}

export async function logAiError(details: Record<string, unknown>, actor?: AiLogActor) {
  try {
    await AuditLog.create({
      ...(actor ? { adminId: actor.adminId } : {}),
      action: 'ai_error',
      resource: 'ai_controller',
      content: 'error',
      details: actor ? { email: actor.email, ...details } : details,
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Failed to write AI error log', err);
  }
}

/** Một lượt hội thoại AI Manage (phiên chat), gắn admin + email + sessionId. */
export async function logAiChatTurn(params: {
  adminId: string;
  email: string;
  sessionId: string;
  userMessage: string;
  assistantMessage: string;
}) {
  try {
    await AuditLog.create({
      adminId: params.adminId,
      action: 'ai_chat',
      resource: 'ai_chat',
      content: 'log',
      details: {
        sessionId: params.sessionId,
        email: params.email,
        userMessage: params.userMessage,
        assistantMessage: params.assistantMessage,
      },
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Failed to write AI chat log', err);
  }
}

