import { Request, Response } from 'express';
import { Payment } from '../models/Payment.js';
import { User } from '../models/User.js';
import { updatePaymentStatus } from '../controllers/paymentController.js';
import { AuthRequest } from '../types/index.js';

export const testPaymentSuccess = async (req: Request, res: Response) => {
  try {
    // Tìm user đầu tiên để tạo payment demo
    let testUser = await User.findOne({ role: { $in: ['admin', 'moderator'] } });
    
    if (!testUser) {
      testUser = await User.findOne();
    }

    if (!testUser) {
      return res.status(404).json({ error: 'No user found to create test payment' });
    }

    // Tạo payment demo với status pending
    const demoPayment = await Payment.create({
      userId: testUser._id,
      amount: 100000,
      xuReceived: 1000,
      status: 'pending',
      transactionId: `TEST-${Date.now()}`,
    });

    // Tạo mock request để gọi updatePaymentStatus
    const mockReq = {
      ...req,
      params: { id: demoPayment._id.toString() },
      body: { status: 'success' },
      user: { userId: testUser._id.toString() }
    } as unknown as AuthRequest;

    // Tạo response wrapper để capture response từ updatePaymentStatus
    let capturedResponse: any = null;
    const mockRes = {
      ...res,
      json: (data: any) => {
        capturedResponse = data;
        return res.json({
          message: 'Test payment success created and logged successfully',
          payment: data.payment,
          logCreated: true,
        });
      },
      status: (code: number) => {
        return {
          ...mockRes,
          json: (data: any) => {
            return res.status(code).json(data);
          }
        };
      }
    } as Response;

    // Gọi hàm updatePaymentStatus để tự động tạo log
    await updatePaymentStatus(mockReq, mockRes);
  } catch (error: any) {
    res.status(500).json({ 
      error: 'Failed to create test payment success',
      details: error.message 
    });
  }
};
