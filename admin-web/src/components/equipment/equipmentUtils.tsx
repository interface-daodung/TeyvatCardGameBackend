import type { Item, LevelStat } from '../../services/gameDataService';

/** Chỉ cho phép số nguyên dương (0, 1, 2, ...) - không có dấu . , */
export const onlyPositiveInt = (e: React.KeyboardEvent<HTMLInputElement>) => {
  if (['.', ',', '-', 'e', 'E', '+'].includes(e.key)) e.preventDefault();
};

/** Re-export for consumers that need LevelStat */
export type { LevelStat };

/** Item type for display - combines Item from API + localization name/description */
export interface GameItem {
  _id: string;
  name: string;
  nameId: string;
  image: string;
  basePower: number;
  baseCooldown: number;
  description: string;
  level: number;
  maxLevel: number;
  powerFormula?: 'healing' | 'base';
  nameTranslations?: Record<string, string>;
  descriptionTranslations?: Record<string, string>;
  levelStats?: LevelStat[];
  status?: 'ban' | 'pre-release' | string;
}

export const getDisplayPower = (item: GameItem): number => {
  if (item.powerFormula === 'healing') {
    return item.basePower * (1 + item.level * 0.15);
  }
  return item.basePower * (1 + item.level * 0.2);
};

export const getDisplayCooldown = (item: GameItem): number => {
  return Math.max(0, item.baseCooldown - item.level * 0.5);
};

/** Bôi màu power (đỏ) và cooldown (xanh) trong description */
export const renderColoredDescription = (
  template: string,
  powerVal: number,
  cooldownVal: number
) => {
  const parts: (string | JSX.Element)[] = [];
  const re = /\{basePower\}|\{baseCooldown\}|\{currPower\}|\{currCooldown\}/g;
  let lastIndex = 0;
  let match;
  let key = 0;
  while ((match = re.exec(template)) !== null) {
    parts.push(<span key={key++}>{template.slice(lastIndex, match.index)}</span>);
    if (match[0] === '{basePower}' || match[0] === '{currPower}') {
      parts.push(
        <span key={key++} className="text-red-600 font-medium">
          {powerVal}
        </span>
      );
    } else {
      parts.push(
        <span key={key++} className="text-blue-600 font-medium">
          {cooldownVal}
        </span>
      );
    }
    lastIndex = re.lastIndex;
  }
  parts.push(<span key={key++}>{template.slice(lastIndex)}</span>);
  return <>{parts}</>;
};

export const getItemImageUrl = (imageName: string) =>
  `/assets/images/item/${imageName}.webp`;

/** Map Item from API + localization data -> GameItem for display */
export function toGameItem(
  item: Item,
  nameLoc: { translations?: Record<string, string> } | null,
  descLoc: { translations?: Record<string, string> } | null
): GameItem {
  const nameTranslations = nameLoc?.translations ?? {};
  const descriptionTranslations = descLoc?.translations ?? {};
  return {
    _id: item._id,
    name: nameTranslations.en ?? item.nameId,
    nameId: item.nameId,
    image: item.nameId,
    basePower: item.basePower,
    baseCooldown: item.baseCooldown,
    description: descriptionTranslations.en ?? '',
    level: 0,
    maxLevel: item.maxLevel,
    levelStats: item.levelStats ?? [],
    nameTranslations,
    descriptionTranslations,
  };
}

export type EditingField = 'basePower' | 'baseCooldown' | null;
export type I18nPopupField = 'name' | 'description' | 'level' | null;
