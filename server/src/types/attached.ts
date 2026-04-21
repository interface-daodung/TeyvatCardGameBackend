import { Schema } from 'mongoose';

/** Ảnh đính kèm (vd. skin / biến thể): định danh + đường dẫn/link ảnh. */
export type AttachedType = 'SE' | 'image' | 'animation';

function inferAttachedTypeFromPath(imagePath: string): AttachedType {
  const normalized = imagePath.replace(/\\/g, '/').toLowerCase();
  if (normalized.includes('/assets/images/animations/')) return 'animation';
  if (normalized.includes('/assets/sounds/se/')) return 'SE';
  return 'image';
}

export interface IAttached {
  nameId: string;
  image: string;
  type: AttachedType;
  /** Chỉ dùng khi `type=animation`. */
  frameRate?: number;
  /** Chỉ dùng khi `type=animation`. */
  frameTotal?: number;
}

/** Sub-document Mongoose cho một phần tử trong mảng `attached` (Character, AdventureCard, Item). */
export const AttachedSchema = new Schema<IAttached>(
  {
    nameId: { type: String, required: true },
    image: { type: String, required: true, default: '' },
    type: {
      type: String,
      enum: ['SE', 'image', 'animation'],
      required: true,
      default: 'image',
    },
    frameRate: { type: Number, required: false, min: 1 },
    frameTotal: { type: Number, required: false, min: 1 },
  },
  { _id: false }
);

AttachedSchema.pre('validate', function normalizeAttachedAnimationFields(next) {
  const doc = this as unknown as IAttached;
  if (!doc.type) {
    doc.type = inferAttachedTypeFromPath(doc.image ?? '');
  }
  if (doc.type !== 'animation') {
    doc.frameRate = undefined;
    doc.frameTotal = undefined;
  }
  next();
});
