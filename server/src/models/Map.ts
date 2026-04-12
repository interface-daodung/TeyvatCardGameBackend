import mongoose, { Schema } from 'mongoose';

export interface IMapTypeRatios {
  enemies?: number;
  food?: number;
  weapons?: number;
  coins?: number;
  traps?: number;
  treasures?: number;
  bombs?: number;
}

export interface IMap extends mongoose.Document {
  nameId: string;
  name: string;
  description: string;
  map_background?: string;
  typeRatios: IMapTypeRatios;
  deck: mongoose.Types.ObjectId[]; // Adventure cards that can appear
  status: 'enabled' | 'disabled';
  createdAt: Date;
  updatedAt: Date;
}

const mapSchema = new Schema<IMap>(
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
    map_background: {
      type: String,
      default: '',
    },
    typeRatios: {
      type: Schema.Types.Mixed,
      default: () => ({}),
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
