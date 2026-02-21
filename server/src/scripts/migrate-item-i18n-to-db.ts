/**
 * Migration: Thêm các key i18n cho item (item.{nameId}.name, item.{nameId}.description) vào DB.
 * Chỉ thêm key chưa tồn tại để không ghi đè bản dịch đã chỉnh trong admin.
 * Chạy từ thư mục server:
 *   npx tsx src/scripts/migrate-item-i18n-to-db.ts
 *
 * Nguồn nameId: collection Item trong DB, hoặc fallback từ TeyvatCard/public/data/items.json.
 * Nguồn bản dịch mặc định: TeyvatCard/public/data/locales/vi.json, en.json, ja.json.
 */
import dotenv from 'dotenv';
import fs from 'fs';
import mongoose from 'mongoose';
import path from 'path';

import { Item } from '../models/Item.js';
import { Localization } from '../models/Localization.js';

dotenv.config();

const LOCALES_DIR = path.join(process.cwd(), '..', 'TeyvatCard', 'public', 'data', 'locales');
const ITEMS_JSON_PATH = path.join(process.cwd(), '..', 'TeyvatCard', 'public', 'data', 'items.json');

type LocaleData = Record<string, string>;

function loadLocaleFile(filename: string): { lang: string; data: LocaleData } | null {
  const filepath = path.join(LOCALES_DIR, filename);
  if (!fs.existsSync(filepath)) return null;
  try {
    const data = JSON.parse(fs.readFileSync(filepath, 'utf-8')) as LocaleData;
    const lang = path.basename(filename, '.json');
    return { lang, data };
  } catch {
    return null;
  }
}

/** Lấy danh sách nameId từ DB (Item) hoặc từ items.json. */
async function getItemNameIds(): Promise<string[]> {
  const fromDb = await Item.find().distinct('nameId');
  if (fromDb.length > 0) return fromDb;

  if (!fs.existsSync(ITEMS_JSON_PATH)) {
    console.warn('Không tìm thấy items.json. Trả về mảng rỗng.');
    return [];
  }
  const raw = JSON.parse(fs.readFileSync(ITEMS_JSON_PATH, 'utf-8'));
  const arr = Array.isArray(raw) ? raw : [];
  return arr
    .map((o: { nameId?: string }) => o?.nameId)
    .filter((id: unknown): id is string => typeof id === 'string');
}

async function migrate() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/teyvat-card-game');
  console.log('Connected to MongoDB');

  const nameIds = await getItemNameIds();
  if (nameIds.length === 0) {
    console.log('Không có item nameId nào (DB trống và không có items.json).');
    process.exit(0);
  }
  console.log(`Tìm thấy ${nameIds.length} item nameIds.`);

  const itemKeys = new Set<string>();
  for (const nameId of nameIds) {
    itemKeys.add(`item.${nameId}.name`);
    itemKeys.add(`item.${nameId}.description`);
  }

  const files = fs.readdirSync(LOCALES_DIR).filter((f) => f.endsWith('.json'));
  const localeEntries = files
    .map((f) => loadLocaleFile(f))
    .filter((e): e is { lang: string; data: LocaleData } => e != null);

  if (localeEntries.length === 0) {
    console.warn('Không đọc được file locale; sẽ tạo bản ghi với translations rỗng.');
  }

  const existingKeys = await Localization.find({ key: { $in: Array.from(itemKeys) } }).distinct('key');
  const existingSet = new Set(existingKeys);
  const toInsert = Array.from(itemKeys).filter((k) => !existingSet.has(k));

  if (toInsert.length === 0) {
    console.log('Tất cả key item i18n đã tồn tại trong DB. Không cần thêm mới.');
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

  console.log(`Done. Added ${inserted} new item i18n keys.`);
  process.exit(0);
}

migrate().catch((err) => {
  console.error('Migration error:', err);
  process.exit(1);
});
