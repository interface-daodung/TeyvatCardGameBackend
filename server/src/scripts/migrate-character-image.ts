/**
 * Migration: them field `image` cho toan bo Character
 *
 * Gia tri image:
 *   /assets/images/cards/character/${nameId}.webp
 *
 * Chay:
 *   npx tsx src/scripts/migrate-character-image.ts
 *   # hoac:
 *   # npm run migrate:character-image
 */
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { Character } from '../models/Character.js';

dotenv.config();

async function migrate() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/teyvat-card-game');
  console.log('Connected to MongoDB');

  const basePath = '/assets/images/cards/character';

  const characters = await Character.find({}, { _id: 1, nameId: 1 });

  if (characters.length === 0) {
    console.log('Khong co Character nao de cap nhat.');
    process.exit(0);
  }

  const operations = characters.map((character) => ({
    updateOne: {
      filter: { _id: character._id },
      update: { $set: { image: `${basePath}/${character.nameId}.webp` } },
    },
  }));

  const result = await Character.bulkWrite(operations);

  console.log(`Da cap nhat image cho ${result.modifiedCount ?? 0} Character document(s).`);
  process.exit(0);
}

migrate().catch((err) => {
  console.error('Migration error:', err);
  process.exit(1);
});
