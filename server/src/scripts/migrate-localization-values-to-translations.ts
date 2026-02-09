/**
 * Migration: đổi schema localization từ `values` sang `translations`
 * Chạy: npx ts-node src/scripts/migrate-localization-values-to-translations.ts
 */
import dotenv from 'dotenv';
import mongoose from 'mongoose';

dotenv.config();

async function migrate() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/teyvat-card-game');
  const db = mongoose.connection.db;
  if (!db) throw new Error('DB not connected');

  const coll = db.collection('localizations');
  const docs = await coll.find({ values: { $exists: true } }).toArray();

  if (docs.length === 0) {
    console.log('Không có document nào cần migrate.');
    process.exit(0);
  }

  for (const doc of docs) {
    const values = doc.values;
    const translations =
      values instanceof Map ? Object.fromEntries(values) : values ?? {};
    await coll.updateOne(
      { _id: doc._id },
      { $set: { translations }, $unset: { values: '' } }
    );
    console.log(`Migrated: ${doc.key}`);
  }

  console.log(`Done. Migrated ${docs.length} documents.`);
  process.exit(0);
}

migrate().catch((err) => {
  console.error(err);
  process.exit(1);
});
