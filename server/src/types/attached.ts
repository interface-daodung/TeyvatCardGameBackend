import { Schema } from 'mongoose';

/** Ảnh đính kèm (vd. skin / biến thể): định danh + đường dẫn/link ảnh. */
export interface IAttached {
  nameId: string;
  image: string;
}

/** Sub-document Mongoose cho một phần tử trong mảng `attached` (Character, AdventureCard, Item). */
export const AttachedSchema = new Schema<IAttached>(
  {
    nameId: { type: String, required: true },
    image: { type: String, required: true, default: '' },
  },
  { _id: false }
);
