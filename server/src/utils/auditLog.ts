import { AuditLog } from '../models/AuditLog.js';
import { AuthRequest } from '../types/index.js';

function parseUserAgent(ua: string): { os: string; deviceType: string } {
  if (!ua || typeof ua !== 'string') return { os: 'Unknown', deviceType: 'Unknown' };
  const u = ua.toLowerCase();
  let os = 'Unknown';
  if (u.includes('windows nt 10')) os = 'Windows 10/11';
  else if (u.includes('windows nt')) os = 'Windows';
  else if (u.includes('mac os x') || u.includes('macintosh')) os = 'macOS';
  else if (u.includes('iphone') || u.includes('ipad')) os = u.includes('ipad') ? 'iPadOS' : 'iOS';
  else if (u.includes('android')) os = 'Android';
  else if (u.includes('linux')) os = 'Linux';
  else if (u.includes('cros')) os = 'Chrome OS';

  let deviceType = 'desktop';
  if (u.includes('mobile') && !u.includes('ipad')) deviceType = 'mobile';
  else if (u.includes('tablet') || u.includes('ipad')) deviceType = 'tablet';

  return { os, deviceType };
}

export const createAuditLog = async (
  req: AuthRequest | any,
  action: string,
  resource: string,
  resourceId?: string,
  details?: Record<string, any>,
  adminId?: string,
  content?: 'info' | 'log' | 'error'
) => {
  try {
    const ipAddress = req?.ip || req?.socket?.remoteAddress || undefined;
    const userId = adminId || req?.user?.userId;
    const userAgent = req?.get?.('User-Agent') ?? undefined;
    const { os, deviceType } = parseUserAgent(userAgent || '');
    const detailsMerged = {
      ...details,
      ...(userAgent && { userAgent }),
      ...(os && { os }),
      ...(deviceType && { deviceType }),
    };
    await AuditLog.create({
      ...(userId && { adminId: userId }),
      action,
      resource,
      resourceId: resourceId || undefined,
      details: Object.keys(detailsMerged).length ? detailsMerged : undefined,
      content: content ?? 'info',
      ipAddress,
    });
  } catch (error) {
    console.error('Failed to create audit log:', error);
  }
};
