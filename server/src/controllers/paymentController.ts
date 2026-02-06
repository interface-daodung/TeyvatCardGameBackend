import { Response } from 'express';
import { Payment } from '../models/Payment.js';
import { User } from '../models/User.js';
import { AuthRequest } from '../types/index.js';
import { createAuditLog } from '../utils/auditLog.js';
import { notificationManager } from '../utils/notificationManager.js';
import { z } from 'zod';

export const getPayments = async (req: AuthRequest, res: Response) => {
  try {
    const rawPage = parseInt(req.query.page as string) || 1;
    const rawLimit = parseInt(req.query.limit as string) || 20;
    const status = req.query.status as string | undefined;
    const query = status ? { status } : {};

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

    res.json({
      payments,
      pagination: {
        page,
        limit,
        total,
        pages,
      },
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch payments' });
  }
};

export const getPaymentById = async (req: AuthRequest, res: Response) => {
  try {
    const payment = await Payment.findById(req.params.id).populate('userId', 'email');

    if (!payment) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    res.json(payment);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch payment' });
  }
};

export const getPaymentStats = async (req: AuthRequest, res: Response) => {
  try {
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

    res.json({
      totalRevenue: totalRevenue[0]?.total || 0,
      totalPayments,
      revenueByDate,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch payment stats' });
  }
};

const updatePaymentStatusSchema = z.object({
  status: z.enum(['pending', 'success', 'failed']),
});

export const updatePaymentStatus = async (req: AuthRequest, res: Response) => {
  try {
    const { status } = updatePaymentStatusSchema.parse(req.body);
    const paymentId = req.params.id;

    const payment = await Payment.findById(paymentId);
    if (!payment) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    const oldStatus = payment.status;
    payment.status = status;
    await payment.save();

    if (status === 'success') {
      await createAuditLog(
        req,
        'update_payment_status',
        'payment',
        payment._id.toString(),
        {
          oldStatus,
          newStatus: status,
          amount: payment.amount,
          xuReceived: payment.xuReceived,
          userId: payment.userId.toString(),
        }
      );

      // Tạo notification khi payment thành công
      const user = await User.findById(payment.userId).select('email');
      const userEmail = user?.email || 'Unknown User';
      
      notificationManager.sendNotification({
        name: 'Payment Notification',
        icon: '💵',
        notif: `${userEmail} đã nạp ${payment.xuReceived}xu (${payment.amount.toLocaleString('vi-VN')} VNĐ)`,
        path: '/payments',
        'data-creation': new Date().toISOString()
      });
    }

    res.json({
      message: 'Payment status updated successfully',
      payment,
    });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: error.errors });
    }
    res.status(500).json({ error: 'Failed to update payment status' });
  }
};
