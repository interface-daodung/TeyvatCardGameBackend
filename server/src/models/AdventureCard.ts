import mongoose, { Schema } from 'mongoose';

export interface IAdventureCard extends mongoose.Document {
  name: string;
  description: string;
  type: 'situation' | 'food' | 'monster' | 'temporary_weapon';
  stats?: {
    attack?: number;
    defense?: number;
    health?: number;
    effect?: string;
  };
  appearanceRate: number; // Percentage (0-100)
  status: 'enabled' | 'disabled' | 'hidden';
  createdAt: Date;
  updatedAt: Date;
}

const adventureCardSchema = new Schema<IAdventureCard>(
  {
    name: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      default: '',
    },
    type: {
      type: String,
      enum: ['situation', 'food', 'monster', 'temporary_weapon'],
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
      effect: {
        type: String,
      },
    },
    appearanceRate: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
      default: 10,
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

export const AdventureCard = mongoose.model<IAdventureCard>('AdventureCard', adventureCardSchema);
