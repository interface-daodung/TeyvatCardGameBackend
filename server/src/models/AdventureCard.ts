import mongoose, { Schema } from 'mongoose';

export interface IAdventureCard extends mongoose.Document {
  nameId: string;
  name: string;
  description: string;
  type: 'weapon' | 'enemy' | 'food' | 'trap' | 'treasure' | 'bomb' | 'coin' | 'empty';
  category?: string; // e.g. sword (for weapon)
  element?: string; // anemo, cryo, etc. (for enemy, coin)
  clan?: string; // e.g. hilichurl (for enemy)
  rarity?: number;
  className?: string;
  status: 'enabled' | 'disabled' | 'hidden';
  image?: string; // image URI for admin-web
  // Additional fields based on type
  healthMin?: number;
  healthMax?: number;
  scoreMin?: number;
  scoreMax?: number;
  damageMin?: number;
  damageMax?: number;
  damage?: number;
  countdown?: number;
  durabilityMin?: number;
  durabilityMax?: number;
  foodMin?: number;
  foodMax?: number;
  food?: number;
  hp?: number;
  resonanceDescription?: string;
  createdAt: Date;
  updatedAt: Date;
}

const adventureCardSchema = new Schema<IAdventureCard>(
  {
    nameId: {
      type: String,
      required: true,
      unique: true,
    },
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
      enum: ['weapon', 'enemy', 'food', 'trap', 'treasure', 'bomb', 'coin', 'empty'],
      required: true,
    },
    category: { type: String },
    element: { type: String },
    clan: { type: String },
    rarity: { type: Number, min: 1, max: 5 },
    className: { type: String },
    image: { type: String },
    status: {
      type: String,
      enum: ['enabled', 'disabled', 'hidden'],
      default: 'enabled',
    },
    // Additional fields based on type
    healthMin: { type: Number },
    healthMax: { type: Number },
    scoreMin: { type: Number },
    scoreMax: { type: Number },
    damageMin: { type: Number },
    damageMax: { type: Number },
    damage: { type: Number },
    countdown: { type: Number },
    durabilityMin: { type: Number },
    durabilityMax: { type: Number },
    foodMin: { type: Number },
    foodMax: { type: Number },
    food: { type: Number },
    hp: { type: Number },
    resonanceDescription: { type: String },
  },
  {
    timestamps: true,
  }
);

export const AdventureCard = mongoose.model<IAdventureCard>('AdventureCard', adventureCardSchema);
