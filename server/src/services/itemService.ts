import { Item } from '../models/Item.js';

export async function getItems() {
  const items = await Item.find().sort({ nameId: 1 });
  return { items };
}

export async function getItemById(id: string) {
  const item = await Item.findById(id);
  return item;
}

export async function updateItem(id: string, data: Record<string, unknown>) {
  const item = await Item.findByIdAndUpdate(id, data, { new: true, runValidators: true });
  return item;
}
