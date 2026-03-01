import { Theme } from '../models/Theme.js';

export async function getThemes() {
  const themes = await Theme.find().sort({ createdAt: -1 });
  return { themes };
}

export async function getThemeById(id: string) {
  const theme = await Theme.findById(id);
  return theme;
}

export async function createTheme(data: Record<string, unknown>) {
  const theme = await Theme.create(data);
  return theme;
}

export async function updateTheme(id: string, data: Record<string, unknown>) {
  const theme = await Theme.findByIdAndUpdate(id, data, { new: true, runValidators: true });
  return theme;
}

export async function deleteTheme(id: string) {
  const theme = await Theme.findByIdAndDelete(id);
  return theme;
}
