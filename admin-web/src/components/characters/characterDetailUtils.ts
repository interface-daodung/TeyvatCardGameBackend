export const CARD_IMAGE_RATIO = { width: 420, height: 720 };

/** Spritesheet animation (Phaser) — cùng kích thước frame với asset. */
export const SPRITESHEET_FRAME_WIDTH = 350;
export const SPRITESHEET_FRAME_HEIGHT = 590;
export const SPRITESHEET_TOTAL_FRAMES = 76;

/** Key Phaser ổn định theo URL (tránh trùng cache texture khi đổi file). */
export function phaserSpritesheetTextureKey(nameId: string, url: string): string {
  let h = 0;
  for (let i = 0; i < url.length; i++) h = (Math.imul(31, h) + url.charCodeAt(i)) | 0;
  const id = (h >>> 0).toString(36);
  return `ss_${nameId.replace(/[^a-zA-Z0-9_-]/g, '_')}_${id}`.slice(0, 96);
}

export const LEVEL_MAX_DEFAULT = 10;

/** HP trong admin: số nguyên từ 1 đến 99 (gồm cả hai đầu). */
export const HP_MIN = 1;
export const HP_MAX = 99;

/** Unlock price: số nguyên > 1 (tối thiểu 2). */
export const UNLOCK_PRICE_MIN = 2;
export const DEFAULT_UNLOCK_PRICE = 100;

export const ELEMENT_OPTIONS = ['anemo', 'cryo', 'dendro', 'electro', 'geo', 'hydro', 'pyro'] as const;
export type ElementOption = (typeof ELEMENT_OPTIONS)[number];

/** Giá gợi ý theo level khi không có dữ liệu (level 1 = unlock, mỗi bậc +100). */
export const getDefaultLevelPrice = (level: number) => level * 100;

export type EditingField = 'element' | null;

type LevelRow = { level: number; price: number };

/** Ưu tiên unlockPrice DB; không có thì giá level 1; không thì mặc định. */
export function resolveUnlockPriceFromCharacter(c: {
  unlockPrice?: number | null;
  levelStats?: { level: number; price: number }[];
}): number {
  const u = c.unlockPrice;
  if (typeof u === 'number' && Number.isFinite(u) && u >= UNLOCK_PRICE_MIN) {
    return Math.floor(u);
  }
  const s1 = c.levelStats?.find((s) => s.level === 1)?.price;
  if (typeof s1 === 'number' && Number.isFinite(s1) && s1 > 0) {
    return Math.floor(s1);
  }
  return DEFAULT_UNLOCK_PRICE;
}

/**
 * Gắn giá từng level: level 1 = unlockPrice; level thiếu/0/null → level trước + 100.
 */
export function mergeCharacterLevelPrices(
  maxLevel: number,
  unlockPrice: number,
  stats: LevelRow[]
): LevelRow[] {
  const map = new Map<number, number>();
  for (const s of stats) {
    map.set(s.level, s.price);
  }
  const rows: LevelRow[] = [];
  for (let l = 1; l <= maxLevel; l++) {
    const raw = map.get(l);
    const missing = raw === undefined || raw === null || Number(raw) === 0;
    let p: number;
    if (l === 1) {
      p = unlockPrice;
    } else if (missing) {
      p = rows[l - 2].price + 100;
    } else {
      p = Math.floor(Number(raw));
    }
    rows.push({ level: l, price: p });
  }
  return rows;
}
