import { AuditLog } from '../models/AuditLog.js';
import { AuthRequest } from '../types/index.js';

export const createAuditLog = async (
  req: AuthRequest | any,
  action: string,
  resource: string,
  resourceId?: string,
  details?: Record<string, any>,
  adminId?: string
) => {
  try {
    const ipAddress = req.ip || req.socket.remoteAddress || undefined;
    const userId = adminId || req.user?.userId;
    
    if (!userId) {
      console.error('Failed to create audit log: adminId is required');
      return;
    }
    
    await AuditLog.create({
      adminId: userId,
      action,
      resource,
      resourceId: resourceId ? resourceId : undefined,
      details,
      ipAddress,
    });
  } catch (error) {
    console.error('Failed to create audit log:', error);
  }
};
