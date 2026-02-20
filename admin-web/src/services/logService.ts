import api from '../lib/api';

export interface AuditLog {
  _id: string;
  adminId?: {
    _id: string;
    email: string;
  };
  action: string;
  resource: string;
  resourceId?: string;
  details?: Record<string, unknown>;
  /** 'info' = mặc định, 'log' = sự kiện log, 'error' = thông báo lỗi */
  content?: 'info' | 'log' | 'error';
  ipAddress?: string;
  createdAt: string;
}

export interface LogsResponse {
  logs: AuditLog[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export const logService = {
  getLogs: async (
    page = 1,
    limit = 20,
    opts?: { action?: string; resource?: string; content?: 'info' | 'log' | 'error'; email?: string }
  ): Promise<LogsResponse> => {
    const response = await api.get<LogsResponse>('/logs', {
      params: { page, limit, ...opts },
    });
    return response.data;
  },

  getLogById: async (id: string): Promise<AuditLog> => {
    const response = await api.get<AuditLog>(`/logs/${id}`);
    return response.data;
  },
};
