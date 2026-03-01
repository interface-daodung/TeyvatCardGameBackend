import mongoose from 'mongoose';
import { Map } from '../models/Map.js';

export async function getMaps(status?: string) {
  const query = status ? { status } : {};
  const maps = await Map.find(query).populate('deck').sort({ createdAt: -1 });
  return { maps };
}

export async function getMapById(id: string) {
  const map = await Map.findById(id).populate('deck');
  return map;
}

export async function createMap(data: Record<string, unknown> & { deck?: string[] }) {
  const deck = (data.deck ?? []).map((id: string) => new mongoose.Types.ObjectId(id));
  const map = await Map.create({ ...data, deck });
  const populated = await Map.findById(map._id).populate('deck');
  return populated;
}

export async function updateMap(id: string, data: Record<string, unknown> & { deck?: string[] }) {
  const updateData: Record<string, unknown> = { ...data };
  if (Array.isArray(data.deck)) {
    updateData.deck = data.deck.map((id: string) => new mongoose.Types.ObjectId(id));
  }
  const map = await Map.findByIdAndUpdate(id, updateData, { new: true, runValidators: true }).populate('deck');
  return map;
}

export async function deleteMap(id: string) {
  const map = await Map.findByIdAndDelete(id);
  return map;
}
