import { Item } from '../models/Item.js';
import { normalizeItemImageLink } from '../utils/itemImage.js';

/** Đồng bộ `nameClass` và `className` (legacy) để admin / export đọc đúng. */
function syncItemClassFields(payload: Record<string, unknown>): Record<string, unknown> {
  const out = { ...payload };
  if (!Object.prototype.hasOwnProperty.call(out, 'nameClass') && !Object.prototype.hasOwnProperty.call(out, 'className')) {
    return out;
  }
  const raw = (out.nameClass ?? out.className ?? '') as string;
  const v = typeof raw === 'string' ? raw.trim() : '';
  out.nameClass = v;
  out.className = v;
  return out;
}

export async function getItems() {
  const items = await Item.find().sort({ nameId: 1 });
  return { items };
}

export async function getItemById(id: string) {
  const item = await Item.findById(id);
  return item;
}

export async function updateItem(id: string, data: Record<string, unknown>) {
  const payload = syncItemClassFields({ ...data });
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
  unlockPrice?: number;
  levelStats?: { power: number; cooldown: number; price: number }[];
  className?: string;
  nameClass?: string;
  status?: 'enabled' | 'disabled';
}) {
  const unlockPrice = Math.max(0, Math.floor(Number(data.unlockPrice ?? 0)));
  const status =
    data.status === 'enabled' ? 'enabled' : 'disabled';
  const classPayload = syncItemClassFields({
    nameClass: data.nameClass,
    className: data.className,
  } as Record<string, unknown>);
  const nameClass = (classPayload.nameClass as string) ?? '';
  const item = await Item.create({
    nameId: data.nameId.trim(),
    image: normalizeItemImageLink(data.image),
    basePower: data.basePower,
    baseCooldown: data.baseCooldown,
    maxLevel: data.maxLevel ?? 10,
    unlockPrice,
    levelStats: data.levelStats ?? [],
    status,
    nameClass,
    className: nameClass,
  });
  return item;
}
