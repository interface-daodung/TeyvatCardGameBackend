/**
 * Migration: xoa field cu `assets.backgroundImage` trong collection themes.
 *
 * Chay (cung cach voi cac migrate khac trong repo — dung tsx, khong dung ts-node):
 *   npm run migrate:remove-theme-background-image
 *   npx tsx src/scripts/migrate-remove-theme-background-image.ts
 */
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { Theme } from '../models/Theme.js';

dotenv.config();

async function migrate() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/teyvat-card-game');
  console.log('Connected to MongoDB');

  const docsToMigrate = await Theme.countDocuments({
    'assets.backgroundImage': { $exists: true },
  });

  if (docsToMigrate === 0) {
    console.log('Khong co theme nao con field assets.backgroundImage.');
    process.exit(0);
  }

  const result = await Theme.updateMany(
    { 'assets.backgroundImage': { $exists: true } },
    { $unset: { 'assets.backgroundImage': 1 } }
  );

  console.log(`Da unset assets.backgroundImage cho ${result.modifiedCount} themes.`);
  process.exit(0);
}

migrate().catch((err) => {
  console.error('Migration error:', err);
  process.exit(1);
});
