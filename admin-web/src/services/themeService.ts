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

export interface ThemeAssetIcons {
  compass: string;
  equip: string;
  library: string;
}

export interface ThemeAssets {
  background: string;
  icons: ThemeAssetIcons;
}

export interface Theme {
  _id: string;
  name: string;
  colors: ThemeColors;
  assets?: ThemeAssets;
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

const DEFAULT_ASSETS: ThemeAssets = {
  background: '/assets/images/ui/background/default.webp',
  icons: {
    compass: '/assets/images/ui/compass.webp',
    equip: '/assets/images/ui/equip.webp',
    library: '/assets/images/ui/library.webp',
  },
};

export const defaultThemeColors = (): ThemeColors => ({ ...DEFAULT_COLORS });
export const defaultThemeAssets = (): ThemeAssets => ({
  background: DEFAULT_ASSETS.background,
  icons: { ...DEFAULT_ASSETS.icons },
});

/** API cũ có thể trả `backgroundImage`; ưu tiên `background`. */
type ThemeAssetsInput = Partial<ThemeAssets> & { backgroundImage?: string };

export const mergeThemeAssets = (assets?: ThemeAssetsInput | null): ThemeAssets => ({
  background:
    assets?.background?.trim() ||
    assets?.backgroundImage?.trim() ||
    DEFAULT_ASSETS.background,
  icons: {
    compass: assets?.icons?.compass?.trim() || DEFAULT_ASSETS.icons.compass,
    equip: assets?.icons?.equip?.trim() || DEFAULT_ASSETS.icons.equip,
    library: assets?.icons?.library?.trim() || DEFAULT_ASSETS.icons.library,
  },
});

export async function getThemes(): Promise<Theme[]> {
  const response = await api.get<ThemesResponse>('/themes');
  return response.data.themes;
}

export async function getThemeById(id: string): Promise<Theme> {
  const response = await api.get<Theme>(`/themes/${id}`);
  return response.data;
}

export async function createTheme(data: { name: string; colors: ThemeColors; assets?: ThemeAssets }): Promise<Theme> {
  const response = await api.post<Theme>('/themes', data);
  return response.data;
}

export async function updateTheme(
  id: string,
  data: { name?: string; colors?: Partial<ThemeColors>; assets?: Partial<ThemeAssets> }
): Promise<Theme> {
  const response = await api.patch<Theme>(`/themes/${id}`, data);
  return response.data;
}

export async function deleteTheme(id: string): Promise<void> {
  await api.delete(`/themes/${id}`);
}
