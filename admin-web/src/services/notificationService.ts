import api from '../lib/api';

export interface NotificationItem {
  _id?: string;
  name: string;
  icon: string;
  notif: string;
  path: string;
  'data-creation': string;
}

export interface NotificationsResponse {
  notifications: NotificationItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

const DEFAULT_LIMIT = 50;

export const notificationService = {
  getNotifications: async (
    page = 1,
    limit = DEFAULT_LIMIT
  ): Promise<NotificationsResponse> => {
    const response = await api.get<NotificationsResponse>('/notifications', {
      params: { page, limit },
    });
    return response.data;
  },
};
