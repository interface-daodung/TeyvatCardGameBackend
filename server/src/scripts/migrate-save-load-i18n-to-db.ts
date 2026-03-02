/**
 * Migration: Thêm các key i18n cho load/save (load_success, save_success, load_error, save_error) vào DB.
 * Chỉ thêm key chưa tồn tại để không ghi đè bản dịch đã chỉnh trong admin.
 *
 * Chạy từ thư mục server:
 *   npx tsx src/scripts/migrate-save-load-i18n-to-db.ts
 */
import dotenv from 'dotenv';
import mongoose from 'mongoose';

import { Localization } from '../models/Localization.js';

dotenv.config();

/** 4 key cần thêm với bản dịch vi, en, ja */
const SAVE_LOAD_KEYS: Record<string, Record<string, string>> = {
  load_success: {
    vi: 'Đã tải dữ liệu.',
    en: 'Data loaded.',
    ja: 'データを読み込みました。',
  },
  save_success: {
    vi: 'Đã lưu.',
    en: 'Saved.',
    ja: '保存しました。',
  },
  load_error: {
    vi: 'Không thể tải dữ liệu.',
    en: 'Unable to load data.',
    ja: 'データを読み込めませんでした。',
  },
  save_error: {
    vi: 'Không thể lưu.',
    en: 'Unable to save.',
    ja: '保存できませんでした。',
  },
};

async function migrate() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/teyvat-card-game');
  console.log('Connected to MongoDB');

  const keys = Object.keys(SAVE_LOAD_KEYS);
  const existingKeys = await Localization.find({ key: { $in: keys } }).distinct('key');
  const existingSet = new Set(existingKeys);
  const toInsert = keys.filter((k) => !existingSet.has(k));

  if (toInsert.length === 0) {
    console.log('Tất cả key load/save i18n đã tồn tại trong DB. Không cần thêm mới.');
    process.exit(0);
  }

  let inserted = 0;
  for (const key of toInsert) {
    const translations = SAVE_LOAD_KEYS[key];
    await Localization.create({ key, translations });
    inserted++;
    console.log(`Added: ${key}`);
  }

  console.log(`Done. Added ${inserted} new load/save i18n keys.`);
  process.exit(0);
}

migrate().catch((err) => {
  console.error('Migration error:', err);
  process.exit(1);
});
