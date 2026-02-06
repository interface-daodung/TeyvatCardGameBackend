import api from '../lib/api';

export interface DashboardStats {
  totalUsers: number;
  totalRevenue: number;
  totalPayments: number;
  totalCharacters: number;
  totalEquipment: number;
  totalMaps: number;
  revenueByDate: Array<{ _id: string; revenue: number }>;
  usersByDate: Array<{ _id: string; count: number }>;
}

export const dashboardService = {
  getStats: async (): Promise<DashboardStats> => {
    const response = await api.get<DashboardStats>('/logs/dashboard');
    return response.data;
  },
};
