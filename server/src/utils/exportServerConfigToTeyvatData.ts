/**
 * Ghi dữ liệu từ ServerConfigurationVersion xuống TeyvatCard/public/data.
 * Gọi sau khi sync thành công.
 */
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** Đường dẫn TeyvatCard/public/data. Có thể ghi đè bằng env TEYVAT_DATA_PATH */
const TEYVAT_DATA_DIR =
  process.env.TEYVAT_DATA_PATH ||
  path.resolve(__dirname, '..', '..', '..', 'TeyvatCard', 'public', 'data');

export interface ExportResult {
  success: boolean;
  files: { path: string; ok: boolean; error?: string }[];
  errors: string[];
}

type RawDoc = Record<string, unknown>;

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
    const raw = (c as any)._id;
    const id = raw && typeof raw.toString === 'function' ? raw.toString() : raw ? String(raw) : '';
    if (id) cardById.set(id, c);
  }

  // dungeonList: Map[] -> game format
  const dungeonList = maps
    .filter((m) => (m as any).status === 'enabled')
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
      return {
        stageId: (m as any).nameId ?? (m as any).name,
        name: (m as any).name,
        typeRatios: (m as any).typeRatios ?? {},
        availableCards,
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
    const status = (c as any).status;
    if (status && status !== 'enabled') continue;
    const type = ((c as any).type ?? 'empty') as string;
    const arr = typeGroups[type] ?? typeGroups.empty;
    const entry: Record<string, unknown> = {
      id: (c as any).nameId,
      name: (c as any).name,
      type: (c as any).type,
      description: (c as any).description ?? '',
      className: (c as any).className ?? (c as any).nameId,
    };
    if ((c as any).category != null) entry.category = (c as any).category;
    if ((c as any).element != null) entry.element = (c as any).element;
    if ((c as any).clan != null) entry.clan = (c as any).clan;
    if ((c as any).rarity != null) entry.rarity = (c as any).rarity;
    arr.push(entry);
  }
  const libraryCards: Record<string, unknown[]> = {};
  for (const [k, v] of Object.entries(typeGroups)) {
    if (v.length > 0) libraryCards[k] = v;
  }
  if (!libraryCards.empty || libraryCards.empty.length === 0) {
    libraryCards.empty = [{ id: 'empty', name: 'Empty', type: 'empty', description: 'Empty - Thẻ trống không có tác dụng.', className: 'Empty' }];
  }

  // cardCharacterList: Character[]
  const cardCharacterList = characters
    .filter((ch) => ((ch as any).status ?? 'enabled') === 'enabled')
    .map((ch) => ({
      id: (ch as any).nameId,
      name: (ch as any).name,
      description: (ch as any).description ?? '',
      hp: (ch as any).HP ?? (ch as any).hp ?? 10,
      element: (ch as any).element ?? 'none',
    }));

  // theme: first theme or default
  const firstTheme = Array.isArray(themes) && themes.length > 0 ? themes[0] : null;
  const theme = firstTheme
    ? { name: (firstTheme as any).name ?? 'default', colors: (firstTheme as any).colors ?? {} }
    : { name: 'default', colors: { primary: '#95245b', secondary: '#96576a', accent: '#FFD700', neutral: '#e0e0e0', background: '#000000', surface: '#1a1a2e', text: '#ffffff' } };

  // items: Item[] -> game format (nameId, basePower, baseCooldown, maxLevel, levelStats)
  const items = rawItems.map((doc) => {
    const d = doc as any;
    return {
      nameId: d.nameId ?? '',
      basePower: d.basePower ?? 1,
      baseCooldown: d.baseCooldown ?? 4,
      maxLevel: d.maxLevel ?? 10,
      levelStats: Array.isArray(d.levelStats) ? d.levelStats : [],
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
