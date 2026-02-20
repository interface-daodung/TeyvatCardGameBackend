import mongoose, { Schema } from 'mongoose';

export interface IUser extends mongoose.Document {
  email: string;
  password?: string | null;
  role: 'admin' | 'moderator' | 'user';
  isBanned: boolean;
  xu: number;
  /** Refresh token hiện tại (lưu DB để server kiểm tra, thu hồi khi logout) */
  refreshToken?: string | null;
  ownedCharacters: mongoose.Types.ObjectId[];
  ownedEquipment: mongoose.Types.ObjectId[];
  bannedCards: {
    characters: mongoose.Types.ObjectId[];
    equipment: mongoose.Types.ObjectId[];
  };
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: false,
      default: null,
    },
    role: {
      type: String,
      enum: ['admin', 'moderator', 'user'],
      default: 'user',
    },
    isBanned: {
      type: Boolean,
      default: false,
    },
    xu: {
      type: Number,
      default: 0,
      min: 0,
    },
    refreshToken: {
      type: String,
      required: false,
      default: null,
    },
    ownedCharacters: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Character',
      },
    ],
    ownedEquipment: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Equipment',
      },
    ],
    bannedCards: {
      characters: [
        {
          type: Schema.Types.ObjectId,
          ref: 'Character',
        },
      ],
      equipment: [
        {
          type: Schema.Types.ObjectId,
          ref: 'Equipment',
        },
      ],
    },
  },
  {
    timestamps: true,
  }
);

export const User = mongoose.model<IUser>('User', userSchema);
