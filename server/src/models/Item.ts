import mongoose, { Schema } from 'mongoose';

export interface ILevelStat {
  power: number;
  cooldown: number;
  price: number;
}

export interface IItem extends mongoose.Document {
  nameId: string;
  basePower: number;
  baseCooldown: number;
  maxLevel: number;
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
    basePower: {
      type: Number,
      required: true,
      min: 1,
      max: 20,
    },
    baseCooldown: {
      type: Number,
      required: true,
      min: 4,
      max: 19,
    },
    maxLevel: {
      type: Number,
      default: 10,
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
