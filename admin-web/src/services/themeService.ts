import api from '../lib/api';

export interface ThemeColors {
  primary: string;
  secondary: string;
  accent: string;
  neutral: string;
  background: string;
  surface: string;
  text: string;
}

export interface Theme {
  _id: string;
  name: string;
  colors: ThemeColors;
  createdAt: string;
  updatedAt: string;
}

export interface ThemesResponse {
  themes: Theme[];
}

const DEFAULT_COLORS: ThemeColors = {
  primary: '#95245b',
  secondary: '#96576a',
  accent: '#FFD700',
  neutral: '#e0e0e0',
  background: '#000000',
  surface: '#1a1a2e',
  text: '#ffffff',
};

export const defaultThemeColors = (): ThemeColors => ({ ...DEFAULT_COLORS });

export async function getThemes(): Promise<Theme[]> {
  const response = await api.get<ThemesResponse>('/themes');
  return response.data.themes;
}

export async function getThemeById(id: string): Promise<Theme> {
  const response = await api.get<Theme>(`/themes/${id}`);
  return response.data;
}

export async function createTheme(data: { name: string; colors: ThemeColors }): Promise<Theme> {
  const response = await api.post<Theme>('/themes', data);
  return response.data;
}

export async function updateTheme(
  id: string,
  data: { name?: string; colors?: Partial<ThemeColors> }
): Promise<Theme> {
  const response = await api.patch<Theme>(`/themes/${id}`, data);
  return response.data;
}

export async function deleteTheme(id: string): Promise<void> {
  await api.delete(`/themes/${id}`);
}
