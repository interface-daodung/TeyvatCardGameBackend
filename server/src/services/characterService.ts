import { Character } from '../models/Character.js';

const isValidObjectId = (id: string) => /^[a-fA-F0-9]{24}$/.test(id);
const findCharacterByParam = (id: string) =>
  isValidObjectId(id) ? Character.findById(id) : Character.findOne({ nameId: id });

export async function getCharacters(status?: string) {
  const query = status ? { status } : {};
  const characters = await Character.find(query).sort({ createdAt: -1 });
  return { characters };
}

export async function getCharacterById(id: string) {
  const character = await findCharacterByParam(id);
  return character;
}

export async function createCharacter(data: Record<string, unknown>) {
  const character = await Character.create(data);
  return character;
}

export async function updateCharacter(id: string, data: Record<string, unknown>) {
  const existing = await findCharacterByParam(id);
  if (!existing) return null;
  const character = await Character.findByIdAndUpdate(existing._id, data, { new: true, runValidators: true });
  return character;
}

export async function deleteCharacter(id: string) {
  const existing = await findCharacterByParam(id);
  if (!existing) return null;
  const character = await Character.findByIdAndDelete(existing._id);
  return character;
}
