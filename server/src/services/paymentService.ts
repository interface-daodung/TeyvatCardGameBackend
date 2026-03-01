import { Payment } from '../models/Payment.js';

export interface GetPaymentsParams {
  page?: number;
  limit?: number;
  status?: string;
}

export async function getPayments(params: GetPaymentsParams) {
  const rawPage = params.page ?? 1;
  const rawLimit = params.limit ?? 20;
  const query = params.status ? { status: params.status } : {};
  const limit = Math.min(100, Math.max(1, rawLimit));
  const total = await Payment.countDocuments(query);
  const pages = Math.max(1, Math.ceil(total / limit));
  const page = Math.min(pages, Math.max(1, rawPage));
  const skip = (page - 1) * limit;

  const payments = await Payment.find(query)
    .populate('userId', 'email')
    .skip(skip)
    .limit(limit)
    .sort({ createdAt: -1 });

  return { payments, pagination: { page, limit, total, pages } };
}

export async function getPaymentById(id: string) {
  const payment = await Payment.findById(id).populate('userId', 'email');
  return payment;
}

export async function getPaymentStats() {
  const totalRevenue = await Payment.aggregate([
    { $match: { status: 'success' } },
    { $group: { _id: null, total: { $sum: '$amount' } } },
  ]);
  const totalPayments = await Payment.countDocuments({ status: 'success' });
  const revenueByDate = await Payment.aggregate([
    { $match: { status: 'success' } },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
        revenue: { $sum: '$amount' },
        count: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]);
  return {
    totalRevenue: totalRevenue[0]?.total || 0,
    totalPayments,
    revenueByDate,
  };
}

export async function updatePaymentStatus(
  paymentId: string,
  status: 'pending' | 'success' | 'failed'
) {
  const payment = await Payment.findById(paymentId);
  if (!payment) return null;
  const oldStatus = payment.status;
  payment.status = status;
  await payment.save();
  return { payment, oldStatus };
}
