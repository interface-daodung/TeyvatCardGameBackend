import mongoose, { Schema } from 'mongoose';

export interface IUser extends mongoose.Document {
  email: string;
  password: string;
  role: 'admin' | 'moderator' | 'user';
  isBanned: boolean;
  xu: number;
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
      required: true,
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
