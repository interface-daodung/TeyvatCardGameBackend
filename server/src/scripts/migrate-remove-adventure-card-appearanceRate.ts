/**
 * Migration: xóa field `appearanceRate` khỏi tất cả AdventureCard
 *
 * Chạy:
 *   npx tsx src/scripts/migrate-remove-adventure-card-appearanceRate.ts
 *   # hoặc nếu đã thêm npm script:
 *   # npm run migrate:remove-adventure-card-appearanceRate
 */
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { AdventureCard } from '../models/AdventureCard.js';

dotenv.config();

async function migrate() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/teyvat-card-game');
  console.log('Connected to MongoDB');

  const result = await AdventureCard.updateMany(
    { appearanceRate: { $exists: true } },
    { $unset: { appearanceRate: '' } }
  );

  console.log(
    `Đã xóa field appearanceRate khỏi ${result.modifiedCount ?? 0} AdventureCard document(s).`
  );

  process.exit(0);
}

migrate().catch((err) => {
  console.error('Migration error:', err);
  process.exit(1);
});

