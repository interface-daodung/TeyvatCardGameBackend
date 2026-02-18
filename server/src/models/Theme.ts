import mongoose, { Schema } from 'mongoose';

export interface IThemeColors {
  primary: string;
  secondary: string;
  accent: string;
  neutral: string;
  background: string;
  surface: string;
  text: string;
}

export interface ITheme extends mongoose.Document {
  name: string;
  colors: IThemeColors;
  createdAt: Date;
  updatedAt: Date;
}

const themeColorsSchema = new Schema<IThemeColors>(
  {
    primary: { type: String, required: true, default: '#95245b' },
    secondary: { type: String, required: true, default: '#96576a' },
    accent: { type: String, required: true, default: '#FFD700' },
    neutral: { type: String, required: true, default: '#e0e0e0' },
    background: { type: String, required: true, default: '#000000' },
    surface: { type: String, required: true, default: '#1a1a2e' },
    text: { type: String, required: true, default: '#ffffff' },
  },
  { _id: false }
);

const themeSchema = new Schema<ITheme>(
  {
    name: { type: String, required: true, trim: true },
    colors: {
      type: themeColorsSchema,
      required: true,
      default: () => ({
        primary: '#95245b',
        secondary: '#96576a',
        accent: '#FFD700',
        neutral: '#e0e0e0',
        background: '#000000',
        surface: '#1a1a2e',
        text: '#ffffff',
      }),
    },
  },
  {
    timestamps: true,
    collection: 'themes',
  }
);

export const Theme = mongoose.model<ITheme>('Theme', themeSchema);
