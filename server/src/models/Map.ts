import mongoose, { Schema } from 'mongoose';

export interface IMap extends mongoose.Document {
  name: string;
  description: string;
  deck: mongoose.Types.ObjectId[]; // Adventure cards that can appear
  status: 'enabled' | 'disabled';
  createdAt: Date;
  updatedAt: Date;
}

const mapSchema = new Schema<IMap>(
  {
    name: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      default: '',
    },
    deck: [
      {
        type: Schema.Types.ObjectId,
        ref: 'AdventureCard',
      },
    ],
    status: {
      type: String,
      enum: ['enabled', 'disabled'],
      default: 'enabled',
    },
  },
  {
    timestamps: true,
  }
);

export const Map = mongoose.model<IMap>('Map', mapSchema);
