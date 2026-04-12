import { AdventureCard } from '../models/AdventureCard.js';

let legacyAdventureCardStatusMigrated = false;

/** Một lần mỗi process: thẻ cũ `hidden` → `disabled`. */
async function migrateLegacyAdventureCardStatusesOnce() {
  if (legacyAdventureCardStatusMigrated) return;
  legacyAdventureCardStatusMigrated = true;
  try {
    await AdventureCard.collection.updateMany({ status: 'hidden' }, { $set: { status: 'disabled' } });
  } catch {
    /* ignore */
  }
}

export interface GetAdventureCardsFilters {
  status?: string;
  type?: string;
}

export async function getAdventureCards(filters: GetAdventureCardsFilters) {
  await migrateLegacyAdventureCardStatusesOnce();
  const query: Record<string, string> = {};
  if (filters.status) query.status = filters.status;
  if (filters.type) query.type = filters.type;
  const cards = await AdventureCard.find(query).populate('contents').sort({ type: 1, nameId: 1 });
  return { cards };
}

export async function getAdventureCardById(id: string) {
  await migrateLegacyAdventureCardStatusesOnce();
  const card = await AdventureCard.findById(id).populate('contents');
  return card;
}

export async function createAdventureCard(data: Record<string, unknown>) {
  const card = await AdventureCard.create(data);
  return card;
}

export async function updateAdventureCard(id: string, data: Record<string, unknown>) {
  const card = await AdventureCard.findByIdAndUpdate(id, data, { new: true, runValidators: true });
  if (!card) return null;
  return card.populate('contents');
}

export async function deleteAdventureCard(id: string) {
  const card = await AdventureCard.findByIdAndDelete(id);
  return card;
}
