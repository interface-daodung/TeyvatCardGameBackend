import api from '../lib/api';

export interface AuditLog {
  _id: string;
  adminId: {
    _id: string;
    email: string;
  };
  action: string;
  resource: string;
  resourceId?: string;
  details?: Record<string, any>;
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
  getLogs: async (page = 1, limit = 20, action?: string, resource?: string): Promise<LogsResponse> => {
    const response = await api.get<LogsResponse>('/logs', {
      params: { page, limit, action, resource },
    });
    return response.data;
  },

  getLogById: async (id: string): Promise<AuditLog> => {
    const response = await api.get<AuditLog>(`/logs/${id}`);
    return response.data;
  },
};
