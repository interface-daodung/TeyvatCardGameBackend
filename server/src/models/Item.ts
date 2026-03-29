import mongoose, { Schema } from 'mongoose';

export interface ILevelStat {
  power: number;
  cooldown: number;
  price: number;
}

export type ItemStatus = 'enabled' | 'disabled';

export interface IItem extends mongoose.Document {
  nameId: string;
  image: string;
  /** Mặc định `disabled` nếu chưa gán. */
  status?: ItemStatus;
  /**
   * Đường dẫn tương đối file class trong `models/items` (link đã chọn).
   * Đồng bộ với `className` khi lưu (legacy).
   */
  nameClass?: string;
  /** @deprecated Dùng `nameClass`; giữ để đọc document cũ. */
  className?: string;
  basePower: number;
  baseCooldown: number;
  maxLevel: number;
  /** Giá mở khóa (mặc định 0). */
  unlockPrice: number;
  levelStats: ILevelStat[];
  createdAt: Date;
  updatedAt: Date;
}

const levelStatSchema = new Schema<ILevelStat>(
  {
    power: { type: Number, required: true, min: 0 },
    cooldown: { type: Number, required: true, min: 0 },
    price: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const itemSchema = new Schema<IItem>(
  {
    nameId: {
      type: String,
      required: true,
      unique: true,
    },
    image: {
      type: String,
      default: '',
    },
    status: {
      type: String,
      enum: ['enabled', 'disabled'],
      default: 'disabled',
    },
    nameClass: {
      type: String,
      default: '',
    },
    className: {
      type: String,
      default: '',
    },
    basePower: {
      type: Number,
      required: true,
      min: 0,
      max: 50,
    },
    baseCooldown: {
      type: Number,
      required: true,
      min: 0,
      max: 50,
    },
    maxLevel: {
      type: Number,
      default: 10,
    },
    unlockPrice: {
      type: Number,
      default: 0,
      min: 0,
    },
    levelStats: {
      type: [levelStatSchema],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

export const Item = mongoose.model<IItem>('Item', itemSchema);
