/**
 * Migration: Import keys từ TeyvatCard/public/data/locales/*.json vào DB.
 * Chỉ thêm các key chưa tồn tại trong Localization.
 *
 * Chạy từ thư mục server:
 *   npx tsx src/scripts/migrate-locales-to-db.ts
 */
import dotenv from 'dotenv';
import fs from 'fs';
import mongoose from 'mongoose';
import path from 'path';

import { Localization } from '../models/Localization.js';

dotenv.config();

const LOCALES_DIR = path.join(process.cwd(), '..', 'TeyvatCard', 'public', 'data', 'locales');

type LocaleData = Record<string, string>;

function loadLocaleFile(filename: string): { lang: string; data: LocaleData } | null {
  const filepath = path.join(LOCALES_DIR, filename);
  if (!fs.existsSync(filepath)) return null;

  const raw = fs.readFileSync(filepath, 'utf-8');
  try {
    const data = JSON.parse(raw) as LocaleData;
    const lang = path.basename(filename, '.json');
    return { lang, data };
  } catch {
    console.warn(`Skipped ${filename}: invalid JSON`);
    return null;
  }
}

async function migrate() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/teyvat-card-game');
  console.log('Connected to MongoDB');

  const files = fs.readdirSync(LOCALES_DIR).filter((f) => f.endsWith('.json'));
  if (files.length === 0) {
    console.log('Không tìm thấy file locale nào.');
    process.exit(0);
  }

  const localeEntries = files
    .map((f) => loadLocaleFile(f))
    .filter((e): e is { lang: string; data: LocaleData } => e != null);

  if (localeEntries.length === 0) {
    console.log('Không có dữ liệu locale hợp lệ.');
    process.exit(0);
  }

  const allKeys = new Set<string>();
  for (const { data } of localeEntries) {
    for (const key of Object.keys(data)) allKeys.add(key);
  }

  const existingKeys = await Localization.find({ key: { $in: Array.from(allKeys) } }).distinct('key');
  const existingSet = new Set(existingKeys);
  const toInsert = Array.from(allKeys).filter((k) => !existingSet.has(k));

  if (toInsert.length === 0) {
    console.log('Tất cả key đã tồn tại trong DB. Không cần thêm mới.');
    process.exit(0);
  }

  let inserted = 0;
  for (const key of toInsert) {
    const translations: Record<string, string> = {};
    for (const { lang, data } of localeEntries) {
      const value = data[key];
      if (value != null && typeof value === 'string') {
        translations[lang] = value;
      }
    }
    await Localization.create({ key, translations });
    inserted++;
    console.log(`Added: ${key}`);
  }

  console.log(`Done. Added ${inserted} new localization keys.`);
  process.exit(0);
}

migrate().catch((err) => {
  console.error('Migration error:', err);
  process.exit(1);
});
