import mongoose, { Schema } from 'mongoose';

export interface IEquipment extends mongoose.Document {
  name: string;
  description: string;
  slot: string; // e.g., 'weapon', 'armor', 'accessory'
  stats: {
    attack?: number;
    defense?: number;
    health?: number;
  };
  status: 'enabled' | 'disabled' | 'hidden';
  createdAt: Date;
  updatedAt: Date;
}

const equipmentSchema = new Schema<IEquipment>(
  {
    name: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      default: '',
    },
    slot: {
      type: String,
      required: true,
    },
    stats: {
      attack: {
        type: Number,
        min: 0,
      },
      defense: {
        type: Number,
        min: 0,
      },
      health: {
        type: Number,
        min: 0,
      },
    },
    status: {
      type: String,
      enum: ['enabled', 'disabled', 'hidden'],
      default: 'enabled',
    },
  },
  {
    timestamps: true,
  }
);

export const Equipment = mongoose.model<IEquipment>('Equipment', equipmentSchema);
