import mongoose, { Schema } from 'mongoose';

export interface ICharacterLevelStat {
  level: number;
  price: number;
}

export interface ICharacter extends mongoose.Document {
  nameId: string;
  name: string;
  description: string; // i18n key: Character.{nameId}.description
  element: string; // anemo | cryo | dendro | electro | geo | hydro | pyro | none
  HP: number;
  maxLevel: number;
  status: 'enabled' | 'disabled' | 'hidden' | 'unreleased';
  levelStats: ICharacterLevelStat[];
  createdAt: Date;
  updatedAt: Date;
}

const characterLevelStatSchema = new Schema<ICharacterLevelStat>(
  {
    level: { type: Number, required: true, min: 1 },
    price: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const characterSchema = new Schema<ICharacter>(
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
    element: {
      type: String,
      enum: ['anemo', 'cryo', 'dendro', 'electro', 'geo', 'hydro', 'pyro', 'none'],
      default: 'cryo',
    },
    HP: {
      type: Number,
      required: true,
      min: 1,
      default: 10,
    },
    maxLevel: {
      type: Number,
      default: 10,
    },
    status: {
      type: String,
      enum: ['enabled', 'disabled', 'hidden', 'unreleased'],
      default: 'enabled',
    },
    levelStats: {
      type: [characterLevelStatSchema],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

export const Character = mongoose.model<ICharacter>('Character', characterSchema);
