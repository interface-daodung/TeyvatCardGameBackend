import mongoose, { Schema } from 'mongoose';
import { AttachedSchema, type IAttached } from '../types/attached.js';

export interface ICharacterLevelStat {
  level: number;
  price: number;
}

export interface ICharacter extends mongoose.Document {
  nameId: string;
  name: string;
  image: string;
  /** Đường dẫn web spritesheet animation (vd. .../character/Spritesheet/foo.webp). Rỗng = dùng mặc định `{nameId}-sprite.webp`. */
  imageSpritesheet?: string;
  /** Ảnh unlock (thư mục cards/character/unlock). Rỗng/null → hiển thị empty.webp. */
  imageUnlock?: string;
  description: string; // i18n key: Character.{nameId}.description
  element: string; // anemo | cryo | dendro | electro | geo | hydro | pyro | none
  HP: number;
  maxLevel: number;
  /** Giá mở khóa level 1 (trùng giá level 1 trong levelStats khi lưu). Bản ghi cũ có thể chưa có field. */
  unlockPrice?: number;
  status: 'enabled' | 'disabled';
  levelStats: ICharacterLevelStat[];
  /** Danh sách ảnh bổ sung (cặp nameId + link/path ảnh). Bản ghi cũ có thể thiếu field. */
  attached?: IAttached[];
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
    image: {
      type: String,
      default: '',
    },
    imageSpritesheet: {
      type: String,
      default: '',
    },
    imageUnlock: {
      type: String,
      default: '',
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
    unlockPrice: {
      type: Number,
      default: 100,
      min: 2,
    },
    status: {
      type: String,
      enum: ['enabled', 'disabled'],
      default: 'enabled',
    },
    levelStats: {
      type: [characterLevelStatSchema],
      default: [],
    },
    attached: {
      type: [AttachedSchema],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

export const Character = mongoose.model<ICharacter>('Character', characterSchema);
