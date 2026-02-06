import { Response } from 'express';
import { User } from '../models/User.js';
import { Payment } from '../models/Payment.js';
import { Character } from '../models/Character.js';
import { Equipment } from '../models/Equipment.js';
import { Map } from '../models/Map.js';
import { AuthRequest } from '../types/index.js';

export const getDashboardStats = async (req: AuthRequest, res: Response) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalRevenue = await Payment.aggregate([
      { $match: { status: 'success' } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);
    const totalPayments = await Payment.countDocuments({ status: 'success' });
    const totalCharacters = await Character.countDocuments();
    const totalEquipment = await Equipment.countDocuments();
    const totalMaps = await Map.countDocuments();

    const revenueByDate = await Payment.aggregate([
      { $match: { status: 'success' } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          revenue: { $sum: '$amount' },
        },
      },
      { $sort: { _id: 1 } },
      { $limit: 30 },
    ]);

    const usersByDate = await User.aggregate([
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
      { $limit: 30 },
    ]);

    res.json({
      totalUsers,
      totalRevenue: totalRevenue[0]?.total || 0,
      totalPayments,
      totalCharacters,
      totalEquipment,
      totalMaps,
      revenueByDate,
      usersByDate,
    });
  } catch (error: any) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({
      error: 'Failed to fetch dashboard stats',
      message: process.env.NODE_ENV === 'development' ? error?.message : undefined,
    });
  }
};
