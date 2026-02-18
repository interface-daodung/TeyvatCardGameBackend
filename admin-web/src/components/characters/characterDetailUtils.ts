export const CARD_IMAGE_RATIO = { width: 420, height: 720 };
export const LEVEL_MAX_DEFAULT = 10;

export const ELEMENT_OPTIONS = ['anemo', 'cryo', 'dendro', 'electro', 'geo', 'hydro', 'pyro'] as const;
export type ElementOption = (typeof ELEMENT_OPTIONS)[number];

export const getDefaultLevelPrice = (level: number) => level * 100;

export type EditingField = 'hp' | 'element' | 'level' | null;
