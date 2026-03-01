import { Response } from 'express';
import { z } from 'zod';
import * as paymentPayosService from '../services/paymentPayosService.js';
import { AuthRequest } from '../types/index.js';

const createPaymentLinkSchema = z.object({
  uid: z.string().min(1, 'uid is required'),
  packageName: z.string().min(1, 'packageName is required'),
});

const createPaymentLinkGameSchema = z.object({
  amount: z.number().min(1000),
  coins: z.number().min(1),
});

export const createPaymentLink = async (req: AuthRequest, res: Response) => {
  try {
    const { uid, packageName } = createPaymentLinkSchema.parse(req.body);
    const data = await paymentPayosService.createPaymentLink({ uid, packageName });
    if (!data) {
      return res.status(400).json({
        error: 'Package not found',
        availablePackages: Object.keys(paymentPayosService.PACKAGE_DEMO),
        data: null,
      });
    }
    res.json({
      error: 0,
      message: 'Success',
      data: {
        bin: data.bin,
        checkoutUrl: data.checkoutUrl,
        accountNumber: data.accountNumber,
        accountName: data.accountName,
        amount: data.amount,
        description: data.description,
        orderCode: data.orderCode,
        qrCode: data.qrCode,
        packageName: data.packageName,
        xuReceived: data.xuReceived,
        uid: data.uid,
      },
    });
  } catch (error: unknown) {
    const err = error as { name?: string; message?: string };
    if (err.name === 'ZodError') return res.status(400).json({ error: (error as { errors: unknown }).errors });
    if (err.message?.includes('PayOS chưa được cấu hình')) {
      return res.status(503).json({ error: -1, message: err.message, data: null });
    }
    console.error('createPaymentLink error:', error);
    res.status(500).json({ error: -1, message: 'Failed to create payment link', data: null });
  }
};

export const createPaymentLinkGame = async (req: AuthRequest, res: Response) => {
  try {
    const uid = req.user?.userId;
    if (!uid) return res.status(401).json({ error: 'Unauthorized' });
    const { amount, coins } = createPaymentLinkGameSchema.parse(req.body);
    const data = await paymentPayosService.createPaymentLinkGame({ amount, coins, userId: uid });
    res.json({
      error: 0,
      message: 'Success',
      data: {
        checkoutUrl: data.checkoutUrl,
        orderCode: data.orderCode,
        coins: data.coins,
      },
    });
  } catch (error: unknown) {
    const err = error as { name?: string; message?: string };
    if (err.name === 'ZodError') return res.status(400).json({ error: (error as { errors: unknown }).errors });
    if (err.message?.includes('PayOS chưa được cấu hình')) {
      return res.status(503).json({ error: -1, message: err.message, data: null });
    }
    console.error('createPaymentLinkGame error:', error);
    res.status(500).json({ error: -1, message: 'Failed to create payment link', data: null });
  }
};

export const getOrderByOrderCode = async (req: AuthRequest, res: Response) => {
  try {
    const orderCode = parseInt(req.params.orderCode, 10);
    if (isNaN(orderCode)) return res.status(400).json({ error: 'Invalid order code' });
    const order = await paymentPayosService.getOrderByOrderCode(orderCode);
    res.json({ error: 0, message: 'ok', data: order });
  } catch (error: unknown) {
    const err = error as { message?: string };
    if (err.message?.includes('PayOS chưa được cấu hình')) {
      return res.status(503).json({ error: -1, message: err.message, data: null });
    }
    console.error('getOrderByOrderCode error:', error);
    res.status(500).json({ error: -1, message: 'Failed to get order', data: null });
  }
};
