import mongoose, { Schema } from 'mongoose';

export interface INotification extends mongoose.Document {
  name: string;
  icon: string;
  notif: string;
  path: string;
  createdAt: Date;
}

const notificationSchema = new Schema<INotification>(
  {
    name: { type: String, required: true },
    icon: { type: String, required: true },
    notif: { type: String, required: true },
    path: { type: String, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export const Notification = mongoose.model<INotification>('Notification', notificationSchema);
