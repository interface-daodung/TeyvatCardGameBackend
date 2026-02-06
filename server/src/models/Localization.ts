import mongoose, { Schema } from 'mongoose';

export interface ILocalization extends mongoose.Document {
  key: string;
  values: Map<string, string>;
  createdAt: Date;
  updatedAt: Date;
}

const localizationSchema = new Schema<ILocalization>(
  {
    key: {
      type: String,
      required: true,
      unique: true,
    },
    values: {
      type: Map,
      of: String,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

export const Localization = mongoose.model<ILocalization>('Localization', localizationSchema);
