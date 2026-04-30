import type { AttachedImage, Item, LevelStat } from '../../services/gameDataService';

/** Chỉ cho phép số nguyên dương (0, 1, 2, ...) - không có dấu . , */
export const onlyPositiveInt = (e: React.KeyboardEvent<HTMLInputElement>) => {
  if (['.', ',', '-', 'e', 'E', '+'].includes(e.key)) e.preventDefault();
};

/** Re-export for consumers that need LevelStat */
export type { LevelStat };

/** Số tự nhiên (0, 1, 2, …) — power / cooldown / price level */
export function intNat(n: number): number {
  return Math.max(0, Math.floor(Number(n) || 0));
}

/** Level 1: Power = base, Cooldown = base cooldown, Price = unlock price */
export function levelStatFromBase(
  basePower: number,
  baseCooldown: number,
  unlockPrice: number
): LevelStat {
  return {
    power: intNat(basePower),
    cooldown: intNat(baseCooldown),
    price: intNat(unlockPrice),
  };
}

/**
 * Level 1 từ base/unlock; mỗi level tiếp theo: cùng power & cooldown level trước, price = trước + 50.
 */
export function buildDefaultLevelStats(
  basePower: number,
  baseCooldown: number,
  unlockPrice: number,
  maxLevel: number
): LevelStat[] {
  const n = Math.max(1, Math.min(99, Math.floor(maxLevel) || 1));
  const arr: LevelStat[] = [];
  const l1 = levelStatFromBase(basePower, baseCooldown, unlockPrice);
  arr.push(l1);
  for (let i = 1; i < n; i++) {
    const prev = arr[i - 1];
    arr.push({
      power: intNat(prev.power),
      cooldown: intNat(prev.cooldown),
      price: intNat(prev.price + 50),
    });
  }
  return arr;
}

/**
 * Gắn max level với dữ liệu có sẵn: [0] luôn từ base/unlock; các dòng sau lấy từ existing nếu có, không thì +50 từ trước.
 */
export function mergeLevelStatsForMax(
  existing: LevelStat[] | undefined,
  max: number,
  basePower: number,
  baseCooldown: number,
  unlockPrice: number
): LevelStat[] {
  const n = Math.max(1, Math.min(99, max));
  const l1 = levelStatFromBase(basePower, baseCooldown, unlockPrice);
  const arr: LevelStat[] = [l1];
  for (let i = 1; i < n; i++) {
    const fromDb = existing?.[i];
    if (fromDb) {
      arr.push({
        power: intNat(fromDb.power),
        cooldown: intNat(fromDb.cooldown),
        price: intNat(fromDb.price),
      });
    } else {
      const prev = arr[i - 1];
      arr.push({
        power: intNat(prev.power),
        cooldown: intNat(prev.cooldown),
        price: intNat(prev.price + 50),
      });
    }
  }
  return arr;
}

/** Power + Cooldown (số tự nhiên) không được trùng cặp giữa hai level */
export function validateLevelStatsPowerCooldownUnique(
  stats: LevelStat[]
): string | null {
  const seen = new Map<string, number>();
  for (let i = 0; i < stats.length; i++) {
    const s = stats[i];
    const key = `${intNat(s.power)},${intNat(s.cooldown)}`;
    if (seen.has(key)) {
      const firstLvl = seen.get(key)! + 1;
      return `Duplicate Power/Cooldown pair (${intNat(s.power)}, ${intNat(s.cooldown)}) between level ${firstLvl} and level ${i + 1}.`;
    }
    seen.set(key, i);
  }
  return null;
}

/** Item type for display - combines Item from API + localization name/description */
export interface GameItem {
  _id: string;
  name: string;
  nameId: string;
  /** Đường dẫn web đầy đủ `/assets/images/...` hoặc rỗng — không fallback nameId */
  image: string;
  basePower: number;
  baseCooldown: number;
  description: string;
  level: number;
  maxLevel: number;
  /** Giá mở khóa item (DB `unlockPrice`). */
  unlockPrice: number;
  powerFormula?: 'healing' | 'base';
  nameTranslations?: Record<string, string>;
  descriptionTranslations?: Record<string, string>;
  levelStats?: LevelStat[];
  /** Trạng thái item trong DB (enabled / disabled). */
  status: 'enabled' | 'disabled';
  /** Đường dẫn file .ts trong `models/items` (field DB `className`). */
  className?: string;
  /** Ảnh đính kèm (nameId + path), cùng cấu trúc Character.attached. */
  attached?: AttachedImage[];
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

const ASSETS_IMAGES_PREFIX = '/assets/images/';

/** `src` cho thẻ img từ field DB — null = không có link hợp lệ → hiện placeholder */
export function getItemImageSrcFromDb(link: string | undefined): string | null {
  const s = (link ?? '').trim().replace(/\\/g, '/');
  if (!s) return null;
  if (s.startsWith(ASSETS_IMAGES_PREFIX)) return s;
  return null;
}

/**
 * URL mặc định theo nameId (không từ field Item.image) — ví dụ UserDetail / saveGame.
 */
export function getDefaultItemImageUrl(nameId: string): string {
  return `/assets/images/item/${nameId}.webp`;
}

/** Map Item from API + localization data -> GameItem for display */
export function toGameItem(
  item: Item,
  nameLoc: { translations?: Record<string, string> } | null,
  descLoc: { translations?: Record<string, string> } | null
): GameItem {
  const nameTranslations = nameLoc?.translations ?? {};
  const descriptionTranslations = descLoc?.translations ?? {};
  const image =
    typeof item.image === 'string' ? item.image.trim().replace(/\\/g, '/') : '';
  return {
    _id: item._id,
    name: nameTranslations.en ?? item.nameId,
    nameId: item.nameId,
    image,
    className: (() => {
      const nc = typeof item.nameClass === 'string' ? item.nameClass.trim() : '';
      const legacy = typeof item.className === 'string' ? item.className.trim() : '';
      return nc || legacy;
    })(),
    basePower: item.basePower,
    baseCooldown: item.baseCooldown,
    description: descriptionTranslations.en ?? '',
    level: 0,
    maxLevel: item.maxLevel,
    unlockPrice: typeof item.unlockPrice === 'number' ? Math.max(0, Math.floor(item.unlockPrice)) : 0,
    levelStats: item.levelStats ?? [],
    status: item.status === 'enabled' ? 'enabled' : 'disabled',
    nameTranslations,
    descriptionTranslations,
    attached: item.attached,
  };
}

export type EditingField = 'basePower' | 'baseCooldown' | 'unlockPrice' | null;
export type I18nPopupField = 'name' | 'description' | 'level' | null;
