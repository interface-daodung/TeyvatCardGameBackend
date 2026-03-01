import { User } from '../models/User.js';
import { Payment } from '../models/Payment.js';
import { Character } from '../models/Character.js';
import { Map } from '../models/Map.js';
import { Item } from '../models/Item.js';

export async function getDashboardStats() {
  const [totalUsers, totalRevenueAgg, totalPayments, totalCharacters, totalEquipment, totalMaps, revenueByDate, usersByDate] =
    await Promise.all([
      User.countDocuments(),
      Payment.aggregate([
        { $match: { status: 'success' } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
      Payment.countDocuments({ status: 'success' }),
      Character.countDocuments(),
      Item.countDocuments(),
      Map.countDocuments(),
      Payment.aggregate([
        { $match: { status: 'success' } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            revenue: { $sum: '$amount' },
          },
        },
        { $sort: { _id: 1 } },
        { $limit: 30 },
      ]),
      User.aggregate([
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
        { $limit: 30 },
      ]),
    ]);

  return {
    totalUsers,
    totalRevenue: totalRevenueAgg[0]?.total || 0,
    totalPayments,
    totalCharacters,
    totalEquipment,
    totalMaps,
    revenueByDate,
    usersByDate,
  };
}
