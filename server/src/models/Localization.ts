import mongoose, { Schema } from 'mongoose';

export interface ILocalization extends mongoose.Document {
  key: string;
  /** Schema-less: bất kỳ ngôn ngữ nào (en, vi, fr, ja, ...) */
  translations: Record<string, string>;
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
    /** Mixed/Object: cho phép $set với dot notation (translations.fr, ...) và upsert */
    translations: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

export const Localization = mongoose.model<ILocalization>('Localization', localizationSchema);
