/**
 * Migration: Khởi tạo collection server_configuration_versions.
 * Cho phép thêm / sửa / xóa các JSON data (CardsData, MapsData, CharacterData, themeData, itemData, localizations).
 *
 * Chạy từ thư mục server:
 *   npx tsx src/scripts/migrate-init-server-configuration-versions.ts
 */
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { ServerConfigurationVersion } from '../models/ServerConfigurationVersion.js';

dotenv.config();

async function migrate() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/teyvat-card-game');
  console.log('Connected to MongoDB');

  const name = ServerConfigurationVersion.collection.name;
  const db = mongoose.connection.db;
  if (!db) {
    throw new Error('DB not available');
  }

  const collections = await db.listCollections({ name }).toArray();
  if (collections.length > 0) {
    console.log(`Collection "${name}" đã tồn tại. Bỏ qua tạo collection.`);
  } else {
    await db.createCollection(name);
    console.log(`Đã tạo collection "${name}".`);
  }

  const count = await ServerConfigurationVersion.countDocuments();
  if (count === 0) {
    await ServerConfigurationVersion.create({
      version: { major: 1, minor: 0, patch: 0 },
      configuration: {
        CardsData: null,
        MapsData: null,
        CharacterData: null,
        themeData: null,
        itemData: null,
        localizations: { en: null, vi: null, ja: null },
      },
    });
    console.log('Đã tạo document mặc định (version 1.0.0, configuration rỗng).');
  } else {
    console.log(`Đã có ${count} document trong "${name}", không seed thêm.`);
  }

  process.exit(0);
}

migrate().catch((err) => {
  console.error('Migration error:', err);
  process.exit(1);
});
