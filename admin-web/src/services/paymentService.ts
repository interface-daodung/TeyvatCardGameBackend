import api from '../lib/api';

export interface Payment {
  _id: string;
  userId: {
    _id: string;
    email: string;
  };
  amount: number;
  xuReceived: number;
  status: 'pending' | 'success' | 'failed';
  transactionId?: string;
  createdAt: string;
}

export interface PaymentsResponse {
  payments: Payment[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface PaymentStats {
  totalRevenue: number;
  totalPayments: number;
  revenueByDate: Array<{ _id: string; revenue: number; count: number }>;
}

export const paymentService = {
  getPayments: async (page = 1, limit = 20, status?: string): Promise<PaymentsResponse> => {
    const response = await api.get<PaymentsResponse>('/payments', {
      params: { page, limit, status },
    });
    return response.data;
  },

  getPaymentById: async (id: string): Promise<Payment> => {
    const response = await api.get<Payment>(`/payments/${id}`);
    return response.data;
  },

  getStats: async (): Promise<PaymentStats> => {
    const response = await api.get<PaymentStats>('/payments/stats');
    return response.data;
  },
};
