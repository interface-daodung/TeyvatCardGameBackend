import mongoose, { Schema } from 'mongoose';

export interface IAuditLog extends mongoose.Document {
  adminId?: mongoose.Types.ObjectId; // optional khi log đăng nhập thất bại (không có user)
  action: string; // e.g., 'login', 'ban_user', 'disable_card', 'update_currency'
  resource: string; // e.g., 'user', 'character', 'payment'
  resourceId?: mongoose.Types.ObjectId;
  details?: Record<string, any>;
  /** 'info' = mặc định; 'log' = sự kiện cần ghi log; 'error' = thông báo lỗi */
  content?: 'info' | 'log' | 'error';
  ipAddress?: string;
  createdAt: Date;
}

const auditLogSchema = new Schema<IAuditLog>(
  {
    adminId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: false,
    },
    action: {
      type: String,
      required: true,
    },
    resource: {
      type: String,
      required: true,
    },
    resourceId: {
      type: Schema.Types.ObjectId,
    },
    details: {
      type: Schema.Types.Mixed,
    },
    content: {
      type: String,
      enum: ['info', 'log', 'error'],
    },
    ipAddress: {
      type: String,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

export const AuditLog = mongoose.model<IAuditLog>('AuditLog', auditLogSchema);
