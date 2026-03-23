import mongoose, { Schema } from 'mongoose';

export interface IMapLogicLookupCase {
  from: number;
  to: number;
  chain: number[];
}

export interface IMapLogicLookupTable {
  width: number;
  height: number;
  cases: IMapLogicLookupCase[];
}

export interface IMapLogic extends mongoose.Document {
  name: string;
  width: number;
  height: number;
  gridConfig: {
    width: number;
    height: number;
  };
  lookupTable: IMapLogicLookupTable;
  status: 'draft' | 'active';
  createdAt: Date;
  updatedAt: Date;
}

const mapLogicSchema = new Schema<IMapLogic>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    width: {
      type: Number,
      required: true,
      min: 1,
      max: 6,
    },
    height: {
      type: Number,
      required: true,
      min: 1,
      max: 6,
    },
    gridConfig: {
      width: {
        type: Number,
        required: true,
        min: 1,
        max: 6,
      },
      height: {
        type: Number,
        required: true,
        min: 1,
        max: 6,
      },
    },
    lookupTable: {
      type: Schema.Types.Mixed,
      required: true,
    },
    status: {
      type: String,
      enum: ['draft', 'active'],
      default: 'draft',
    },
  },
  { timestamps: true }
);

export const MapLogic = mongoose.model<IMapLogic>('MapLogic', mapLogicSchema);

