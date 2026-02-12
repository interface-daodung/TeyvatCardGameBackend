/**
 * Migration: thêm field `image` cho AdventureCard với URI mặc định
 * Mặc định: `/assets/images/cards/${card.type}/${card.nameId}.webp`
 *
 * Chạy:
 *   npx ts-node src/scripts/migrate-adventure-card-image.ts
 */
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { AdventureCard, IAdventureCard } from '../models/AdventureCard.js';

dotenv.config();

async function migrate() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/teyvat-card-game');
  console.log('Connected to MongoDB');

  const basePath = '/assets/images/cards';

  const cards: IAdventureCard[] = await AdventureCard.find({
    $or: [{ image: { $exists: false } }, { image: null }, { image: '' }],
  });

  if (cards.length === 0) {
    console.log('Không có AdventureCard nào cần cập nhật field image.');
    process.exit(0);
  }

  console.log(`Sẽ cập nhật ${cards.length} adventure cards...`);

  for (const card of cards) {
    const uri = `${basePath}/${card.type}/${card.nameId}.webp`;
    card.image = uri;
    await card.save();
    console.log(`Updated card ${card.nameId} (${card.type}) -> ${uri}`);
  }

  console.log('Hoàn thành migrate AdventureCard.image');
  process.exit(0);
}

migrate().catch((err) => {
  console.error('Migration error:', err);
  process.exit(1);
});

