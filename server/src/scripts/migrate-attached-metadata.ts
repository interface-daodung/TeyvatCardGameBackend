/**
 * Migration: backfill attached metadata (`type`, `frameRate`, `frameTotal`) cho document cũ.
 *
 * Rule:
 * - Infer `type` từ path nếu thiếu/không hợp lệ:
 *   - `/assets/images/animations/` => `animation`
 *   - `/assets/sounds/SE/` => `SE`
 *   - còn lại => `image`
 * - `type=animation` => đảm bảo `frameRate` và `frameTotal` là số nguyên dương (fallback 10/1)
 * - `type=SE|image` => remove `frameRate`, `frameTotal`
 *
 * Chạy:
 *   npx tsx src/scripts/migrate-attached-metadata.ts
 *   # hoặc:
 *   npm run migrate:attached-metadata
 */
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { AdventureCard } from '../models/AdventureCard.js';
import { Character } from '../models/Character.js';
import { Item } from '../models/Item.js';

dotenv.config();

type AttachedType = 'SE' | 'image' | 'animation';
type RawAttached = {
  nameId?: unknown;
  image?: unknown;
  type?: unknown;
  frameRate?: unknown;
  frameTotal?: unknown;
};

function inferAttachedTypeFromPath(imagePath: string): AttachedType {
  const normalized = imagePath.replace(/\\/g, '/').toLowerCase();
  if (normalized.includes('/assets/images/animations/')) return 'animation';
  if (normalized.includes('/assets/sounds/se/')) return 'SE';
  return 'image';
}

function asPositiveInt(value: unknown, fallback: number): number {
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n)) return fallback;
  const rounded = Math.floor(n);
  return rounded > 0 ? rounded : fallback;
}

function normalizeAttachedRow(raw: RawAttached): {
  nameId: string;
  image: string;
  type: AttachedType;
  frameRate?: number;
  frameTotal?: number;
} {
  const nameId = typeof raw.nameId === 'string' ? raw.nameId : '';
  const image = typeof raw.image === 'string' ? raw.image : '';
  const fromType = typeof raw.type === 'string' ? raw.type : '';
  const type: AttachedType =
    fromType === 'SE' || fromType === 'image' || fromType === 'animation'
      ? fromType
      : inferAttachedTypeFromPath(image);

  if (type === 'animation') {
    return {
      nameId,
      image,
      type,
      frameRate: asPositiveInt(raw.frameRate, 10),
      frameTotal: asPositiveInt(raw.frameTotal, 1),
    };
  }
  return { nameId, image, type };
}

function normalizeAttachedArray(rawAttached: unknown): Array<{
  nameId: string;
  image: string;
  type: AttachedType;
  frameRate?: number;
  frameTotal?: number;
}> {
  if (!Array.isArray(rawAttached)) return [];
  return rawAttached
    .filter((x) => x != null && typeof x === 'object')
    .map((x) => normalizeAttachedRow(x as RawAttached));
}

function stableStringify(value: unknown): string {
  return JSON.stringify(value);
}

type MigratableModel = {
  find: (filter: Record<string, never>, projection: { _id: 1; attached: 1 }) => {
    lean: () => Promise<Array<{ _id: unknown; attached?: unknown[] }>>;
  };
  bulkWrite: (operations: Array<{
    updateOne: {
      filter: { _id: unknown };
      update: { $set: { attached: unknown[] } };
    };
  }>) => Promise<{ matchedCount?: number; modifiedCount?: number }>;
};

async function migrateCollection(
  label: 'Character' | 'AdventureCard' | 'Item',
  model: MigratableModel
) {
  const docs = await model.find({}, { _id: 1, attached: 1 }).lean();
  if (docs.length === 0) {
    console.log(`[${label}] no documents found.`);
    return;
  }

  const operations: Array<{
    updateOne: {
      filter: { _id: unknown };
      update: { $set: { attached: unknown[] } };
    };
  }> = [];

  for (const doc of docs) {
    const current = Array.isArray((doc as { attached?: unknown[] }).attached)
      ? (doc as { attached?: unknown[] }).attached
      : [];
    const normalized = normalizeAttachedArray(current);
    if (stableStringify(current) === stableStringify(normalized)) continue;

    operations.push({
      updateOne: {
        filter: { _id: (doc as { _id: unknown })._id },
        update: { $set: { attached: normalized } },
      },
    });
  }

  if (operations.length === 0) {
    console.log(`[${label}] nothing to backfill.`);
    return;
  }

  const result = await model.bulkWrite(operations);
  console.log(
    `[${label}] matched=${result.matchedCount ?? 0}, modified=${result.modifiedCount ?? 0}, ops=${operations.length}`
  );
}

async function migrate() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/teyvat-card-game');
  console.log('Connected to MongoDB');

  await migrateCollection('Character', Character as unknown as MigratableModel);
  await migrateCollection('AdventureCard', AdventureCard as unknown as MigratableModel);
  await migrateCollection('Item', Item as unknown as MigratableModel);

  console.log('Done migrate attached metadata.');
  process.exit(0);
}

migrate().catch((err) => {
  console.error('Migration error:', err);
  process.exit(1);
});
