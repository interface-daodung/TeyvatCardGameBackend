import { Item } from '../models/Item.js';
import { normalizeItemImageLink } from '../utils/itemImage.js';

export async function getItems() {
  const items = await Item.find().sort({ nameId: 1 });
  return { items };
}

export async function getItemById(id: string) {
  const item = await Item.findById(id);
  return item;
}

export async function updateItem(id: string, data: Record<string, unknown>) {
  const payload = { ...data };
  if (Object.prototype.hasOwnProperty.call(payload, 'image') && payload.image !== undefined) {
    payload.image = normalizeItemImageLink(payload.image as string);
  }
  const item = await Item.findByIdAndUpdate(id, payload, { new: true, runValidators: true });
  return item;
}

export async function deleteItem(id: string) {
  const item = await Item.findByIdAndDelete(id);
  return item;
}

export async function createItem(data: {
  nameId: string;
  image: string;
  basePower: number;
  baseCooldown: number;
  maxLevel?: number;
  levelStats?: { power: number; cooldown: number; price: number }[];
}) {
  const item = await Item.create({
    nameId: data.nameId.trim(),
    image: normalizeItemImageLink(data.image),
    basePower: data.basePower,
    baseCooldown: data.baseCooldown,
    maxLevel: data.maxLevel ?? 10,
    levelStats: data.levelStats ?? [],
  });
  return item;
}
