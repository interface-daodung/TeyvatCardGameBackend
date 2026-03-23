import { MapLogic } from '../models/MapLogic.js';

export async function getMapLogics(status?: string) {
  const query = status ? { status } : {};
  const mapLogics = await MapLogic.find(query).sort({ createdAt: -1 });
  return { mapLogics };
}

export async function getMapLogicById(id: string) {
  const mapLogic = await MapLogic.findById(id);
  return mapLogic;
}

export async function createMapLogic(data: Record<string, unknown>) {
  const mapLogic = await MapLogic.create(data);
  return mapLogic;
}

export async function updateMapLogic(id: string, data: Record<string, unknown>) {
  const mapLogic = await MapLogic.findByIdAndUpdate(id, data, { new: true, runValidators: true });
  return mapLogic;
}

export async function deleteMapLogic(id: string) {
  const mapLogic = await MapLogic.findByIdAndDelete(id);
  return mapLogic;
}

