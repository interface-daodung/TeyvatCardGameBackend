/**
 * Migration: them field `image` cho toan bo Item
 *
 * Gia tri image:
 *   /assets/images/item/${nameId}.webp
 *
 * Chay:
 *   npx tsx src/scripts/migrate-item-image.ts
 *   # hoac:
 *   # npm run migrate:item-image
 */
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { Item } from '../models/Item.js';

dotenv.config();

async function migrate() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/teyvat-card-game');
  console.log('Connected to MongoDB');

  const basePath = '/assets/images/item';

  const items = await Item.find({}, { _id: 1, nameId: 1 });

  if (items.length === 0) {
    console.log('Khong co Item nao de cap nhat.');
    process.exit(0);
  }

  const operations = items.map((item) => ({
    updateOne: {
      filter: { _id: item._id },
      update: { $set: { image: `${basePath}/${item.nameId}.webp` } },
    },
  }));

  const result = await Item.bulkWrite(operations);

  console.log(`Da cap nhat image cho ${result.modifiedCount ?? 0} Item document(s).`);
  process.exit(0);
}

migrate().catch((err) => {
  console.error('Migration error:', err);
  process.exit(1);
});
