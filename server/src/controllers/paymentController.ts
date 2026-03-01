import { Response } from 'express';
import * as paymentService from '../services/paymentService.js';
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
    const result = await paymentService.getPayments({ page: rawPage, limit: rawLimit, status });
    res.json(result);
  } catch {
    res.status(500).json({ error: 'Failed to fetch payments' });
  }
};

export const getPaymentById = async (req: AuthRequest, res: Response) => {
  try {
    const payment = await paymentService.getPaymentById(req.params.id);
    if (!payment) return res.status(404).json({ error: 'Payment not found' });
    res.json(payment);
  } catch {
    res.status(500).json({ error: 'Failed to fetch payment' });
  }
};

export const getPaymentStats = async (req: AuthRequest, res: Response) => {
  try {
    const result = await paymentService.getPaymentStats();
    res.json(result);
  } catch {
    res.status(500).json({ error: 'Failed to fetch payment stats' });
  }
};

const updatePaymentStatusSchema = z.object({
  status: z.enum(['pending', 'success', 'failed']),
});

export const updatePaymentStatus = async (req: AuthRequest, res: Response) => {
  try {
    const { status } = updatePaymentStatusSchema.parse(req.body);
    const result = await paymentService.updatePaymentStatus(req.params.id, status);
    if (!result) return res.status(404).json({ error: 'Payment not found' });
    const { payment, oldStatus } = result;

    if (status === 'success') {
      await createAuditLog(req, 'update_payment_status', 'payment', payment._id.toString(), {
        oldStatus,
        newStatus: status,
        amount: payment.amount,
        xuReceived: payment.xuReceived,
        userId: payment.userId.toString(),
      });
      const user = await User.findById(payment.userId).select('email');
      notificationManager.sendNotification({
        name: 'Payment Notification',
        icon: '💵',
        notif: `${user?.email || 'Unknown User'} đã nạp ${payment.xuReceived}xu (${payment.amount.toLocaleString('vi-VN')} VNĐ)`,
        path: '/payments',
        'data-creation': new Date().toISOString(),
      });
    }

    res.json({ message: 'Payment status updated successfully', payment });
  } catch (error: unknown) {
    const err = error as { name?: string; errors?: unknown };
    if (err.name === 'ZodError') return res.status(400).json({ error: err.errors });
    res.status(500).json({ error: 'Failed to update payment status' });
  }
};
