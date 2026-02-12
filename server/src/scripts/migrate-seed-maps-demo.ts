/**
 * Migration: Seed maps từ JSON demo (nameId, typeRatios, availableCards → deck).
 * Data cũ cần xóa trước (Map.deleteMany hoặc xóa tay trong DB).
 *
 * Chạy từ thư mục server:
 *   npx tsx src/scripts/migrate-seed-maps-demo.ts
 */
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { Map as MapModel } from '../models/Map.js';
import { AdventureCard } from '../models/AdventureCard.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface DemoMapItem {
  nameId: string;
  name: string;
  description?: string;
  typeRatios: {
    enemies?: number;
    food?: number;
    weapons?: number;
    coins?: number;
    traps?: number;
    treasures?: number;
    bombs?: number;
  };
  availableCards: Record<string, string[]>;
}

async function migrate() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/teyvat-card-game');
  console.log('Connected to MongoDB');

  const dataPath = join(__dirname, '../data/mapsDemo.json');
  const raw = readFileSync(dataPath, 'utf-8');
  const demoMaps: DemoMapItem[] = JSON.parse(raw);

  const allNameIds = new Set<string>();
  for (const m of demoMaps) {
    for (const arr of Object.values(m.availableCards || {})) {
      if (Array.isArray(arr)) arr.forEach((id) => allNameIds.add(id));
    }
  }

  const cards = await AdventureCard.find({ nameId: { $in: Array.from(allNameIds) } });
  const nameIdToId = new Map(cards.map((c) => [c.nameId, c._id]));

  const missing = Array.from(allNameIds).filter((id) => !nameIdToId.has(id));
  if (missing.length) {
    console.warn('AdventureCard nameIds không tồn tại (sẽ bỏ qua trong deck):', missing);
  }

  const toInsert: Array<{
    nameId: string;
    name: string;
    description: string;
    typeRatios: Record<string, number>;
    deck: mongoose.Types.ObjectId[];
    status: 'enabled';
  }> = [];

  for (const m of demoMaps) {
    const deckNameIds: string[] = [];
    for (const arr of Object.values(m.availableCards || {})) {
      if (Array.isArray(arr)) deckNameIds.push(...arr);
    }
    const deck = [...new Set(deckNameIds)]
      .map((nameId) => nameIdToId.get(nameId))
      .filter((id): id is mongoose.Types.ObjectId => id != null);

    toInsert.push({
      nameId: m.nameId,
      name: m.name,
      description: m.description ?? '',
      typeRatios: m.typeRatios ?? {},
      deck,
      status: 'enabled',
    });
  }

  const existing = await MapModel.countDocuments({ nameId: { $in: demoMaps.map((m) => m.nameId) } });
  if (existing > 0) {
    console.log(`Đã tồn tại ${existing} map trùng nameId. Xóa hoặc bỏ qua. Đang xóa các bản ghi trùng nameId...`);
    await MapModel.deleteMany({ nameId: { $in: demoMaps.map((m) => m.nameId) } });
  }

  const result = await MapModel.insertMany(toInsert);
  console.log(`Đã tạo ${result.length} map demo (nameId, typeRatios, deck).`);

  process.exit(0);
}

migrate().catch((err) => {
  console.error('Migration error:', err);
  process.exit(1);
});
