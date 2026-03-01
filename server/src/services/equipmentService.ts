import { Equipment } from '../models/Equipment.js';

export async function getEquipment(status?: string) {
  const query = status ? { status } : {};
  const equipment = await Equipment.find(query).sort({ createdAt: -1 });
  return { equipment };
}

export async function getEquipmentById(id: string) {
  const equipment = await Equipment.findById(id);
  return equipment;
}

export async function createEquipment(data: Record<string, unknown>) {
  const equipment = await Equipment.create(data);
  return equipment;
}

export async function updateEquipment(id: string, data: Record<string, unknown>) {
  const equipment = await Equipment.findByIdAndUpdate(id, data, { new: true, runValidators: true });
  return equipment;
}

export async function deleteEquipment(id: string) {
  const equipment = await Equipment.findByIdAndDelete(id);
  return equipment;
}
