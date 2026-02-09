import { Response } from 'express';
import { AuthRequest } from '../types/index.js';
import { getPayos } from '../utils/payos.js';
import { z } from 'zod';

// TODO: Lấy từ DB khi có bảng packages - demo tạm thời
const PACKAGE_DEMO: Record<string, { amount: number; xuReceived: number }> = {
  'Gói 100': { amount: 10000, xuReceived: 100 },
  'Gói 500': { amount: 50000, xuReceived: 500 },
  'Gói 1000': { amount: 100000, xuReceived: 1000 },
  'Gói 5000': { amount: 500000, xuReceived: 5000 },
  'Gói 10000': { amount: 1000000, xuReceived: 10000 },
};

const createPaymentLinkSchema = z.object({
  uid: z.string().min(1, 'uid is required'),
  packageName: z.string().min(1, 'packageName is required'),
});

const createPaymentLinkGameSchema = z.object({
  amount: z.number().min(1000),
  coins: z.number().min(1),
});

/**
 * Tạo link thanh toán PayOS
 * Input: uid (userId người chơi), packageName (tên gói nạp)
 */
export const createPaymentLink = async (req: AuthRequest, res: Response) => {
  try {
    const { uid, packageName } = createPaymentLinkSchema.parse(req.body);

    const pkg = PACKAGE_DEMO[packageName];
    if (!pkg) {
      return res.status(400).json({
        error: 'Package not found',
        availablePackages: Object.keys(PACKAGE_DEMO),
      });
    }

    const { amount, xuReceived } = pkg;

    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const returnUrl = `${baseUrl}/test-payos?result=success`;
    const cancelUrl = `${baseUrl}/test-payos?result=cancel`;

    const orderCode = Math.floor(Date.now() / 1000) % 1000000;

    const payos = getPayos();
    const paymentLinkRes = await payos.paymentRequests.create({
      orderCode,
      amount,
      description: `Nạp ${packageName} - ${xuReceived}xu`,
      cancelUrl,
      returnUrl,
      items: [{ name: packageName, quantity: 1, price: amount }],
    });

    res.json({
      error: 0,
      message: 'Success',
      data: {
        bin: paymentLinkRes.bin,
        checkoutUrl: paymentLinkRes.checkoutUrl,
        accountNumber: paymentLinkRes.accountNumber,
        accountName: paymentLinkRes.accountName,
        amount: paymentLinkRes.amount,
        description: paymentLinkRes.description,
        orderCode: paymentLinkRes.orderCode,
        qrCode: paymentLinkRes.qrCode,
        packageName,
        xuReceived,
        uid,
      },
    });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: error.errors });
    }
    if (error.message?.includes('PayOS chưa được cấu hình')) {
      return res.status(503).json({
        error: -1,
        message: error.message,
        data: null,
      });
    }
    console.error('createPaymentLink error:', error);
    res.status(500).json({
      error: -1,
      message: 'Failed to create payment link',
      data: null,
    });
  }
};

/**
 * Tạo link thanh toán cho game (user tự tạo cho mình)
 * Input: amount (VNĐ), coins (số xu/coin nhận)
 */
export const createPaymentLinkGame = async (req: AuthRequest, res: Response) => {
  try {
    const uid = req.user?.userId;
    if (!uid) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { amount, coins } = createPaymentLinkGameSchema.parse(req.body);

    const baseUrl = process.env.GAME_URL || process.env.FRONTEND_URL || 'http://localhost:3000';
    const orderCode = Math.floor(Date.now() / 1000) % 1000000;
    const returnUrl = `${baseUrl}/payment-return.html?orderCode=${orderCode}`;
    const cancelUrl = `${baseUrl}/payment-return.html?orderCode=${orderCode}&cancel=1`;

    const payos = getPayos();
    const paymentLinkRes = await payos.paymentRequests.create({
      orderCode,
      amount,
      description: `Nạp ${coins} xu`,
      cancelUrl,
      returnUrl,
      items: [{ name: `${coins} xu`, quantity: 1, price: amount }],
    });

    res.json({
      error: 0,
      message: 'Success',
      data: {
        checkoutUrl: paymentLinkRes.checkoutUrl,
        orderCode: paymentLinkRes.orderCode,
        coins,
      },
    });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: error.errors });
    }
    if (error.message?.includes('PayOS chưa được cấu hình')) {
      return res.status(503).json({
        error: -1,
        message: error.message,
        data: null,
      });
    }
    console.error('createPaymentLinkGame error:', error);
    res.status(500).json({
      error: -1,
      message: 'Failed to create payment link',
      data: null,
    });
  }
};

/**
 * Lấy thông tin đơn hàng theo orderCode
 */
export const getOrderByOrderCode = async (req: AuthRequest, res: Response) => {
  try {
    const orderCode = parseInt(req.params.orderCode, 10);
    if (isNaN(orderCode)) {
      return res.status(400).json({ error: 'Invalid order code' });
    }

    const payos = getPayos();
    const order = await payos.paymentRequests.get(orderCode);
    res.json({
      error: 0,
      message: 'ok',
      data: order,
    });
  } catch (error: any) {
    if (error.message?.includes('PayOS chưa được cấu hình')) {
      return res.status(503).json({
        error: -1,
        message: error.message,
        data: null,
      });
    }
    console.error('getOrderByOrderCode error:', error);
    res.status(500).json({
      error: -1,
      message: 'Failed to get order',
      data: null,
    });
  }
};
