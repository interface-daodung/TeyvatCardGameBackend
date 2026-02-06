import mongoose, { Schema } from 'mongoose';

export interface ICharacter extends mongoose.Document {
  name: string;
  description: string;
  stats: {
    attack: number;
    defense: number;
    health: number;
  };
  maxLevel: number; // Fixed at 10
  status: 'enabled' | 'disabled' | 'hidden' | 'unreleased';
  createdAt: Date;
  updatedAt: Date;
}

const characterSchema = new Schema<ICharacter>(
  {
    name: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      default: '',
    },
    stats: {
      attack: {
        type: Number,
        required: true,
        min: 0,
      },
      defense: {
        type: Number,
        required: true,
        min: 0,
      },
      health: {
        type: Number,
        required: true,
        min: 0,
      },
    },
    maxLevel: {
      type: Number,
      default: 10,
      immutable: true,
    },
    status: {
      type: String,
      enum: ['enabled', 'disabled', 'hidden', 'unreleased'],
      default: 'enabled',
    },
  },
  {
    timestamps: true,
  }
);

// Ensure maxLevel is always 10
characterSchema.pre('save', function (next) {
  this.maxLevel = 10;
  next();
});

export const Character = mongoose.model<ICharacter>('Character', characterSchema);
