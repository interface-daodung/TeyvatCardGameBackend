/**
 * Ghi dữ liệu từ ServerConfigurationVersion xuống TeyvatCard/public/data.
 * Gọi sau khi sync thành công.
 */
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, '..', '..');

/** Đường dẫn TeyvatCard/public/data. Có thể ghi đè bằng env TEYVAT_DATA_PATH */
const TEYVAT_DATA_DIR =
  process.env.TEYVAT_DATA_PATH ||
  path.resolve(rootDir, '..', 'TeyvatCard', 'public', 'data');

export interface ExportResult {
  success: boolean;
  files: { path: string; ok: boolean; error?: string }[];
  errors: string[];
}

type RawDoc = Record<string, unknown>;

/** `{ nameId, image }[]` cho client; bỏ phần tử không hợp lệ. */
function normalizeAttached(raw: unknown): { nameId: string; image: string }[] {
  if (!Array.isArray(raw)) return [];
  const out: { nameId: string; image: string }[] = [];
  for (const x of raw) {
    if (x == null || typeof x !== 'object') continue;
    const o = x as Record<string, unknown>;
    const nameId = typeof o.nameId === 'string' ? o.nameId : '';
    const image = typeof o.image === 'string' ? o.image : '';
    if (nameId || image) out.push({ nameId, image });
  }
  return out;
}

function strField(doc: RawDoc, key: string, fallback = ''): string {
  const v = doc[key];
  return typeof v === 'string' ? v : fallback;
}

function cardIdString(c: RawDoc): string {
  const raw = (c as { _id?: unknown })._id;
  return raw && typeof (raw as { toString?: () => string }).toString === 'function'
    ? (raw as { toString: () => string }).toString()
    : raw
      ? String(raw)
      : '';
}

/**
 * Map nào có trong `deck` tham chiếu tới AdventureCard `status === 'disabled'` thì không được export.
 * Trả về danh sách lỗi mô tả từng map cần sửa.
 */
export function validateMapsDeckHasNoDisabledCards(configuration: Record<string, unknown>): {
  ok: boolean;
  errors: string[];
} {
  const maps = (configuration.MapsData as { maps?: RawDoc[] })?.maps ?? [];
  const cards = (configuration.CardsData as { cards?: RawDoc[] })?.cards ?? [];

  const cardById = new Map<string, RawDoc>();
  for (const c of cards) {
    const id = cardIdString(c);
    if (id) cardById.set(id, c);
  }

  const errors: string[] = [];
  for (const m of maps) {
    const mapLabel = String((m as { nameId?: string; name?: string }).nameId ?? (m as { name?: string }).name ?? '?');
    const deck = ((m as { deck?: unknown[] }).deck ?? []) as unknown[];
    for (const deckId of deck) {
      const deckIdStr =
        deckId && typeof (deckId as { toString?: () => string }).toString === 'function'
          ? (deckId as { toString: () => string }).toString()
          : deckId
            ? String(deckId)
            : '';
      if (!deckIdStr) continue;
      const card = cardById.get(deckIdStr);
      if (!card) continue;
      const st = (card as { status?: string }).status;
      if (st === 'disabled') {
        const cardLabel = String((card as { nameId?: string }).nameId ?? deckIdStr);
        errors.push(`Map "${mapLabel}": deck chứa thẻ đã tắt (disabled) — "${cardLabel}".`);
      }
    }
  }

  return { ok: errors.length === 0, errors };
}

/**
 * Transform configuration sang format JSON mà TeyvatCard game expect.
 */
function transformToTeyvatFormat(configuration: Record<string, unknown>): {
  dungeonList: unknown[];
  libraryCards: Record<string, unknown[]>;
  cardCharacterList: unknown[];
  theme: Record<string, unknown>;
  items: unknown[];
  locales: { en: Record<string, string>; vi: Record<string, string>; ja: Record<string, string> };
} {
  const maps = (configuration.MapsData as { maps?: RawDoc[] })?.maps ?? [];
  const cards = (configuration.CardsData as { cards?: RawDoc[] })?.cards ?? [];
  const characters = (configuration.CharacterData as { characters?: RawDoc[] })?.characters ?? [];
  const themes = (configuration.themeData as { themes?: RawDoc[] })?.themes ?? [];
  const rawItems = (configuration.itemData as { items?: RawDoc[] })?.items ?? [];
  const localizations = configuration.localizations as {
    en?: Record<string, string>;
    vi?: Record<string, string>;
    ja?: Record<string, string>;
  } | undefined;

  // Build card lookup by _id (handle ObjectId từ lean())
  const cardById = new Map<string, RawDoc>();
  for (const c of cards) {
    const id = cardIdString(c);
    if (id) cardById.set(id, c);
  }

  // dungeonList: Map[] -> game format (chỉ map enabled)
  const dungeonList = maps
    .filter((m) => ((m as { status?: string }).status ?? 'enabled') === 'enabled')
    .map((m) => {
      const deck = ((m as any).deck ?? []) as unknown[];
      const availableCards: Record<string, string[]> = {
        enemies: [],
        food: [],
        weapons: [],
        coins: [],
        traps: [],
        treasures: [],
        bombs: [],
      };
      // Map AdventureCard type (singular) -> availableCards key (plural)
      const typeToKey: Record<string, string> = {
        enemy: 'enemies',
        weapon: 'weapons',
        food: 'food',
        trap: 'traps',
        treasure: 'treasures',
        bomb: 'bombs',
        coin: 'coins',
      };
      for (const deckId of deck) {
        const deckIdStr =
          deckId && typeof (deckId as any).toString === 'function'
            ? (deckId as any).toString()
            : deckId
              ? String(deckId)
              : '';
        if (!deckIdStr) continue;
        const card = cardById.get(deckIdStr);
        if (!card) continue;
        const type = (card as any).type as string;
        const className = (card as any).className ?? (card as any).nameId;
        if (!type || !className || type === 'empty') continue;
        const key = typeToKey[type];
        if (key && !availableCards[key].includes(className)) {
          availableCards[key].push(className);
        }
      }
      const stageId = (m as any).nameId ?? (m as any).name;
      const md = m as RawDoc;
      return {
        stageId,
        name: `map.${stageId}.name`,
        typeRatios: (m as any).typeRatios ?? {},
        availableCards,
        map_background: (m as any).map_background ?? '',
        image: strField(md, 'image'),
        imageSpritesheet: strField(md, 'imageSpritesheet'),
        imageUnlock: strField(md, 'imageUnlock'),
        attached: normalizeAttached(md.attached),
      };
    });

  // libraryCards: AdventureCard[] grouped by type
  const typeGroups: Record<string, unknown[]> = {
    weapon: [],
    enemy: [],
    food: [],
    trap: [],
    treasure: [],
    bomb: [],
    coin: [],
    empty: [],
  };
  for (const c of cards) {
    if (((c as { status?: string }).status ?? 'enabled') !== 'enabled') continue;
    const cd = c as RawDoc;
    const type = ((c as any).type ?? 'empty') as string;
    const arr = typeGroups[type] ?? typeGroups.empty;
    const id = (c as any).nameId;
    const entry: Record<string, unknown> = {
      id,
      name: `adventureCard.${id}.name`,
      type: (c as any).type,
      description: `adventureCard.${id}.description`,
      className: (c as any).className ?? (c as any).nameId,
      image: strField(cd, 'image'),
      imageSpritesheet: strField(cd, 'imageSpritesheet'),
      imageUnlock: strField(cd, 'imageUnlock'),
      attached: normalizeAttached(cd.attached),
    };
    if ((c as any).category != null) entry.category = (c as any).category;
    if ((c as any).element != null) entry.element = (c as any).element;
    if ((c as any).clan != null) entry.clan = (c as any).clan;
    if ((c as any).rarity != null) entry.rarity = (c as any).rarity;

    // Additional fields for different card types
    if ((c as any).healthMin != null) entry.healthMin = (c as any).healthMin;
    if ((c as any).healthMax != null) entry.healthMax = (c as any).healthMax;
    if ((c as any).hp != null) entry.hp = (c as any).hp;
    if ((c as any).scoreMin != null) entry.scoreMin = (c as any).scoreMin;
    if ((c as any).scoreMax != null) entry.scoreMax = (c as any).scoreMax;
    if ((c as any).damageMin != null) entry.damageMin = (c as any).damageMin;
    if ((c as any).damageMax != null) entry.damageMax = (c as any).damageMax;
    if ((c as any).countdown != null) entry.countdown = (c as any).countdown;
    if ((c as any).durabilityMin != null) entry.durabilityMin = (c as any).durabilityMin;
    if ((c as any).durabilityMax != null) entry.durabilityMax = (c as any).durabilityMax;
    if ((c as any).foodMin != null) entry.foodMin = (c as any).foodMin;
    if ((c as any).foodMax != null) entry.foodMax = (c as any).foodMax;
    if ((c as any).resonanceDescription != null) entry.resonanceDescription = (c as any).resonanceDescription;
    if (Array.isArray((c as any).contents)) entry.contents = (c as any).contents;

    arr.push(entry);
  }
  const libraryCards: Record<string, unknown[]> = {};
  for (const [k, v] of Object.entries(typeGroups)) {
    if (v.length > 0) libraryCards[k] = v;
  }
  if (!libraryCards.empty || libraryCards.empty.length === 0) {
    libraryCards.empty = [
      {
        id: 'empty',
        name: 'Empty',
        type: 'empty',
        description: 'Empty - Thẻ trống không có tác dụng.',
        className: 'Empty',
        image: '',
        imageSpritesheet: '',
        imageUnlock: '',
        attached: [],
      },
    ];
  }

  // cardCharacterList: Character[]
  const cardCharacterList = characters
    .filter((ch) => ((ch as any).status ?? 'enabled') === 'enabled')
    .map((ch) => {
      const d = ch as RawDoc;
      const id = typeof d.nameId === 'string' ? d.nameId : String(d.nameId ?? '');
      return {
        id,
        name: `character.${id}.name`,
        description: (d.description as string) ?? '',
        hp: (d.HP as number) ?? (d.hp as number) ?? 10,
        element: (d.element as string) ?? 'none',
        maxLevel: (d.maxLevel as number) ?? 10,
        levelStats: Array.isArray(d.levelStats) ? d.levelStats : [],
        image: strField(d, 'image'),
        imageSpritesheet: strField(d, 'imageSpritesheet'),
        imageUnlock: strField(d, 'imageUnlock'),
        attached: normalizeAttached(d.attached),
      };
    });

  // theme: export full theme list as key-value by name. Game ThemeManager cần đủ 11 màu (primary..text + success, warning, error, info).
  const defaultColors: Record<string, string> = {
    primary: '#95245b',
    secondary: '#96576a',
    accent: '#FFD700',
    neutral: '#e0e0e0',
    background: '#000000',
    surface: '#1a1a2e',
    text: '#ffffff',
    success: '#2ecc71',
    warning: '#f1c40f',
    error: '#e74c3c',
    info: '#3498db',
  };
  const themeMap: Record<string, { name: string; colors: Record<string, unknown> }> = {};
  if (Array.isArray(themes)) {
    for (const t of themes) {
      const name = ((t as any).name as string) || 'default';
      const raw = (t as any).colors ?? {};
      const colors: Record<string, unknown> = { ...defaultColors };
      for (const k of Object.keys(defaultColors)) {
        if (raw[k] != null && typeof raw[k] === 'string') colors[k] = raw[k];
      }
      themeMap[name] = { name, colors };
    }
  }

  const theme: Record<string, unknown> =
    Object.keys(themeMap).length > 0
      ? themeMap
      : {
          default: {
            name: 'default',
            colors: { ...defaultColors },
          },
        };

  // items: chỉ export khi status === 'enabled'; thiếu field hoặc disabled → bỏ qua (mặc định coi là disabled).
  const items = rawItems
    .filter((doc) => {
      const d = doc as Record<string, unknown>;
      return d.status === 'enabled';
    })
    .map((doc) => {
      const d = doc as Record<string, unknown>;
      const nameClassRaw = d.nameClass ?? d.className;
      const nameClass =
        typeof nameClassRaw === 'string' ? nameClassRaw.trim() : '';
      return {
        nameId: typeof d.nameId === 'string' ? d.nameId : '',
        basePower: typeof d.basePower === 'number' ? d.basePower : 1,
        baseCooldown: typeof d.baseCooldown === 'number' ? d.baseCooldown : 4,
        maxLevel: typeof d.maxLevel === 'number' ? d.maxLevel : 10,
        unlockPrice: typeof d.unlockPrice === 'number' ? d.unlockPrice : 0,
        levelStats: Array.isArray(d.levelStats) ? d.levelStats : [],
        nameClass,
        image: typeof d.image === 'string' ? d.image : '',
        imageSpritesheet: typeof d.imageSpritesheet === 'string' ? d.imageSpritesheet : '',
        imageUnlock: typeof d.imageUnlock === 'string' ? d.imageUnlock : '',
        attached: normalizeAttached(d.attached),
      };
    });

  return {
    dungeonList,
    libraryCards,
    cardCharacterList,
    theme,
    items,
    locales: {
      en: localizations?.en ?? {},
      vi: localizations?.vi ?? {},
      ja: localizations?.ja ?? {},
    },
  };
}

function writeJsonSafe(filePath: string, data: unknown): void {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

/**
 * Export configuration xuống TeyvatCard/public/data.
 * @param configuration - configuration từ ServerConfigurationVersion
 * @returns ExportResult với chi tiết từng file và lỗi
 */
export function exportServerConfigToTeyvatData(
  configuration: Record<string, unknown>
): ExportResult {
  const result: ExportResult = { success: true, files: [], errors: [] };

  try {
    const deckCheck = validateMapsDeckHasNoDisabledCards(configuration);
    if (!deckCheck.ok) {
      result.success = false;
      result.errors.push(
        'Cập nhật thất bại: có map đang lưu deck chứa thẻ đã disabled. Sửa maps (bỏ thẻ đó khỏi deck) rồi thử lại.',
        ...deckCheck.errors
      );
      return result;
    }

    const transformed = transformToTeyvatFormat(configuration);

    if (!fs.existsSync(TEYVAT_DATA_DIR)) {
      result.errors.push(`Teyvat data dir not found: ${TEYVAT_DATA_DIR}`);
      result.success = false;
      return result;
    }

    const tasks: { relPath: string; data: unknown }[] = [
      { relPath: 'dungeonList.json', data: transformed.dungeonList },
      { relPath: 'libraryCards.json', data: transformed.libraryCards },
      { relPath: 'cardCharacterList.json', data: transformed.cardCharacterList },
      { relPath: 'theme.json', data: transformed.theme },
      { relPath: 'items.json', data: transformed.items },
      { relPath: 'locales/en.json', data: transformed.locales.en },
      { relPath: 'locales/vi.json', data: transformed.locales.vi },
      { relPath: 'locales/ja.json', data: transformed.locales.ja },
    ];

    for (const { relPath, data } of tasks) {
      const fullPath = path.join(TEYVAT_DATA_DIR, relPath);
      try {
        writeJsonSafe(fullPath, data);
        result.files.push({ path: relPath, ok: true });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        result.files.push({ path: relPath, ok: false, error: msg });
        result.errors.push(`${relPath}: ${msg}`);
        result.success = false;
      }
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    result.errors.push(`Export failed: ${msg}`);
    result.success = false;
  }

  return result;
}
