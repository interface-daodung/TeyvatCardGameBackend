import { Notification } from '../models/Notification.js';

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;

export interface GetNotificationsParams {
  page?: number;
  limit?: number;
}

export async function getNotifications(params: GetNotificationsParams) {
  const rawPage = params.page ?? 1;
  const rawLimit = params.limit ?? DEFAULT_LIMIT;
  const limit = Math.min(MAX_LIMIT, Math.max(1, rawLimit));
  const total = await Notification.countDocuments();
  const pages = Math.max(1, Math.ceil(total / limit));
  const page = Math.min(pages, Math.max(1, rawPage));
  const skip = (page - 1) * limit;

  const docs = await Notification.find()
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean();

  const notifications = docs.map((d) => ({
    _id: d._id.toString(),
    name: d.name,
    icon: d.icon,
    notif: d.notif,
    path: d.path,
    'data-creation': d.createdAt.toISOString(),
  }));

  return { notifications, pagination: { page, limit, total, pages } };
}
