import crypto from 'crypto';
import { ServerConfigurationVersion } from '../models/ServerConfigurationVersion.js';
import { Map } from '../models/Map.js';
import { AdventureCard } from '../models/AdventureCard.js';
import { Localization } from '../models/Localization.js';
import { Character } from '../models/Character.js';
import { Theme } from '../models/Theme.js';
import { Item } from '../models/Item.js';
import { exportServerConfigToTeyvatData } from '../utils/exportServerConfigToTeyvatData.js';
import { getTeyvatPackageMajor } from '../utils/teyvatPackageVersion.js';

function canonicalJson(obj: unknown): string {
  if (obj === null || typeof obj !== 'object') return JSON.stringify(obj);
  if (Array.isArray(obj)) return '[' + obj.map(canonicalJson).join(',') + ']';
  const keys = Object.keys(obj as object).sort();
  const parts = keys.map((k) => JSON.stringify(k) + ':' + canonicalJson((obj as Record<string, unknown>)[k]));
  return '{' + parts.join(',') + '}';
}

function buildCardsDataForConfig(cards: Record<string, unknown>[]): { cards: Record<string, unknown>[] } {
  const idToClassName: Record<string, string> = {};
  for (const c of cards) {
    const raw = c?._id;
    const id = raw && typeof (raw as { toString?: () => string }).toString === 'function' ? (raw as { toString: () => string }).toString() : raw ? String(raw) : '';
    if (id) idToClassName[id] = ((c.className ?? c.nameId) as string) ?? id;
  }
  const mapContentIdsToClassNames = (contents: unknown): string[] => {
    if (!Array.isArray(contents)) return [];
    return contents
      .map((ref) => {
        const id = ref && typeof (ref as { toString?: () => string }).toString === 'function' ? (ref as { toString: () => string }).toString() : ref ? String(ref) : '';
        return id ? (idToClassName[id] ?? id) : '';
      })
      .filter(Boolean);
  };

  return {
    cards: cards.map((c) => {
      const card = { ...c };
      delete (card as Record<string, unknown>).maxLevel;
      delete (card as Record<string, unknown>).levelStats;
      delete (card as Record<string, unknown>).damage;
      delete (card as Record<string, unknown>).food;
      if (Array.isArray(c.contents) && c.contents.length > 0) {
        (card as Record<string, unknown>).contents = mapContentIdsToClassNames(c.contents);
      }
      return card;
    }),
  };
}

function hashConfiguration(config: Record<string, unknown>): string {
  return crypto.createHash('sha256').update(canonicalJson(config)).digest('hex');
}

export type ConfigChanges = Record<string, { added: string[]; updated: string[]; removed: string[] }>;

function buildConfigDiff(
  prevCfg: Record<string, unknown> | undefined,
  currentCfg: Record<string, unknown>
): ConfigChanges {
  const changes: ConfigChanges = {};
  const getId = (doc: Record<string, unknown>) =>
    (doc?.nameId ?? doc?.name ?? doc?.key ?? (doc?._id ? String(doc._id) : '')) as string;

  const diff = (category: string, current: Record<string, unknown>[], prev: Record<string, unknown>[]) => {
    const prevById: Record<string, Record<string, unknown>> = {};
    for (const p of prev) {
      const id = getId(p);
      if (id) prevById[id] = p;
    }
    const currentIds = new Set<string>();
    const added: string[] = [];
    const updated: string[] = [];
    for (const c of current) {
      const id = getId(c);
      if (!id) continue;
      currentIds.add(id);
      const p = prevById[id];
      const cStr = canonicalJson(c);
      if (!p) added.push(id);
      else if (canonicalJson(p) !== cStr) updated.push(id);
    }
    const removed: string[] = [];
    for (const id of Object.keys(prevById)) {
      if (!currentIds.has(id)) removed.push(id);
    }
    if (added.length || updated.length || removed.length) {
      changes[category] = { added, updated, removed };
    }
  };

  const prevMaps = (prevCfg?.MapsData as { maps?: Record<string, unknown>[] })?.maps ?? [];
  const currMaps = (currentCfg?.MapsData as { maps?: Record<string, unknown>[] })?.maps ?? [];
  const prevCards = (prevCfg?.CardsData as { cards?: Record<string, unknown>[] })?.cards ?? [];
  const currCards = (currentCfg?.CardsData as { cards?: Record<string, unknown>[] })?.cards ?? [];
  const prevChars = (prevCfg?.CharacterData as { characters?: Record<string, unknown>[] })?.characters ?? [];
  const currChars = (currentCfg?.CharacterData as { characters?: Record<string, unknown>[] })?.characters ?? [];
  const prevThemes = (prevCfg?.themeData as { themes?: Record<string, unknown>[] })?.themes ?? [];
  const currThemes = (currentCfg?.themeData as { themes?: Record<string, unknown>[] })?.themes ?? [];
  const prevItems = (prevCfg?.itemData as { items?: Record<string, unknown>[] })?.items ?? [];
  const currItems = (currentCfg?.itemData as { items?: Record<string, unknown>[] })?.items ?? [];

  diff('maps', currMaps, prevMaps);
  diff('cards', currCards, prevCards);
  diff('characters', currChars, prevChars);
  diff('themes', currThemes, prevThemes);
  diff('items', currItems, prevItems);

  const prevEn = (prevCfg?.localizations as { en?: Record<string, string> })?.en ?? {};
  const currEn = (currentCfg?.localizations as { en?: Record<string, string> })?.en ?? {};
  const locAdded: string[] = [];
  const locUpdated: string[] = [];
  const locRemoved: string[] = [];
  for (const k of Object.keys(currEn)) {
    if (!(k in prevEn)) locAdded.push(k);
    else if (prevEn[k] !== currEn[k]) locUpdated.push(k);
  }
  for (const k of Object.keys(prevEn)) {
    if (!(k in currEn)) locRemoved.push(k);
  }
  if (locAdded.length || locUpdated.length || locRemoved.length) {
    changes.localizations = { added: locAdded, updated: locUpdated, removed: locRemoved };
  }
  return changes;
}

const sortVersion = { 'version.major': -1 as const, 'version.minor': -1 as const, 'version.patch': -1 as const, createdAt: -1 as const };

export async function getServerConfigurationVersions() {
  const list = await ServerConfigurationVersion.find().sort(sortVersion);
  return { versions: list };
}

export async function getServerConfigurationVersionById(id: string) {
  const doc = await ServerConfigurationVersion.findById(id);
  return doc;
}

export async function getLatestServerConfigurationVersion() {
  const doc = await ServerConfigurationVersion.findOne().sort(sortVersion);
  return doc;
}

export async function getServerConfigurationCompare() {
  const [latest, previous] = await ServerConfigurationVersion.find().sort(sortVersion).limit(2).lean();
  if (!latest) {
    return { latest: null, previous: null, changes: {} as ConfigChanges };
  }
  const latestCfg = ((latest as Record<string, unknown>).configuration ?? {}) as Record<string, unknown>;
  const previousCfg = previous ? ((previous as Record<string, unknown>).configuration ?? {}) as Record<string, unknown> : undefined;
  const changes = previousCfg ? buildConfigDiff(previousCfg, latestCfg) : {};
  return { latest, previous: previous ?? null, changes };
}

export interface CheckServerConfigurationUpdateResult {
  success: true;
  hasChanges: boolean;
  currentHash: string;
  latestHash: string | null;
  changes?: ConfigChanges;
}

export async function checkServerConfigurationUpdate(): Promise<CheckServerConfigurationUpdateResult> {
  const [latest, maps, cards, localizations, characters, themes, items] = await Promise.all([
    ServerConfigurationVersion.findOne().sort(sortVersion).lean(),
    Map.find().lean(),
    AdventureCard.find().lean(),
    Localization.find().lean(),
    Character.find().lean(),
    Theme.find().lean(),
    Item.find().lean(),
  ]);

  const localizationSnapshot = (() => {
    const en: Record<string, string> = {};
    const vi: Record<string, string> = {};
    const ja: Record<string, string> = {};
    for (const loc of localizations as { key?: string; translations?: Record<string, string> }[]) {
      const translations = loc.translations ?? {};
      const key = loc.key;
      if (!key) continue;
      if (typeof translations.en === 'string' && translations.en.trim() !== '') en[key] = translations.en;
      if (typeof translations.vi === 'string' && translations.vi.trim() !== '') vi[key] = translations.vi;
      if (typeof translations.ja === 'string' && translations.ja.trim() !== '') ja[key] = translations.ja;
    }
    return { en, vi, ja };
  })();

  const configuration: Record<string, unknown> = {
    MapsData: { maps },
    CardsData: buildCardsDataForConfig(cards as Record<string, unknown>[]),
    CharacterData: {
      characters: (characters as Record<string, unknown>[]).map((ch) => ({
        ...ch,
        maxLevel: (ch as Record<string, unknown>).maxLevel ?? 10,
        levelStats: Array.isArray((ch as Record<string, unknown>).levelStats) ? (ch as Record<string, unknown>).levelStats : [],
      })),
    },
    localizations: localizationSnapshot,
    themeData: { themes },
    itemData: {
      items: (items as Record<string, unknown>[]).map((i) => ({
        ...i,
        maxLevel: (i as Record<string, unknown>).maxLevel ?? 10,
        levelStats: Array.isArray((i as Record<string, unknown>).levelStats) ? (i as Record<string, unknown>).levelStats : [],
      })),
    },
  };

  const currentHash = hashConfiguration(configuration);
  const latestCfg = latest?.configuration as Record<string, unknown> | undefined;
  const latestHash = latestCfg ? hashConfiguration(latestCfg) : '';
  const hasChanges = !latest || currentHash !== latestHash;

  const changes: ConfigChanges = {};
  const getId = (doc: Record<string, unknown>) =>
    (doc?.nameId ?? doc?.name ?? doc?.key ?? (doc?._id ? String(doc._id) : '')) as string;

  const diff = (category: string, current: Record<string, unknown>[], prev: Record<string, unknown>[]) => {
    const prevById: Record<string, Record<string, unknown>> = {};
    for (const p of prev) {
      const id = getId(p);
      if (id) prevById[id] = p;
    }
    const currentIds = new Set<string>();
    const added: string[] = [];
    const updated: string[] = [];
    for (const c of current) {
      const id = getId(c);
      if (!id) continue;
      currentIds.add(id);
      const p = prevById[id];
      if (!p) added.push(id);
      else if (canonicalJson(p) !== canonicalJson(c)) updated.push(id);
    }
    const removed: string[] = [];
    for (const id of Object.keys(prevById)) {
      if (!currentIds.has(id)) removed.push(id);
    }
    if (added.length || updated.length || removed.length) {
      changes[category] = { added, updated, removed };
    }
  };

  if (hasChanges && latestCfg) {
    const prevMaps = (latestCfg?.MapsData as { maps?: Record<string, unknown>[] })?.maps ?? [];
    const prevCards = (latestCfg?.CardsData as { cards?: Record<string, unknown>[] })?.cards ?? [];
    const prevChars = (latestCfg?.CharacterData as { characters?: Record<string, unknown>[] })?.characters ?? [];
    const prevThemes = (latestCfg?.themeData as { themes?: Record<string, unknown>[] })?.themes ?? [];
    const prevItems = (latestCfg?.itemData as { items?: Record<string, unknown>[] })?.items ?? [];
    diff('maps', maps as Record<string, unknown>[], prevMaps);
    diff('cards', (configuration.CardsData as { cards?: Record<string, unknown>[] }).cards ?? [], prevCards);
    diff('characters', characters as Record<string, unknown>[], prevChars);
    diff('themes', themes as Record<string, unknown>[], prevThemes);
    diff('items', items as Record<string, unknown>[], prevItems);
    const prevEn = (latestCfg?.localizations as { en?: Record<string, string> })?.en ?? {};
    const currEn = localizationSnapshot.en;
    const locAdded: string[] = [];
    const locUpdated: string[] = [];
    const locRemoved: string[] = [];
    for (const k of Object.keys(currEn)) {
      if (!(k in prevEn)) locAdded.push(k);
      else if (prevEn[k] !== currEn[k]) locUpdated.push(k);
    }
    for (const k of Object.keys(prevEn)) {
      if (!(k in currEn)) locRemoved.push(k);
    }
    if (locAdded.length || locUpdated.length || locRemoved.length) {
      changes.localizations = { added: locAdded, updated: locUpdated, removed: locRemoved };
    }
  }

  return {
    success: true,
    hasChanges,
    currentHash,
    latestHash: latest ? latestHash : null,
    changes: hasChanges ? changes : undefined,
  };
}

export interface SyncServerConfigurationVersionResult {
  success: true;
  doc: InstanceType<typeof ServerConfigurationVersion>;
  versionStr: string;
  exportResult: { success: boolean; files: { path: string; ok: boolean; error?: string }[]; errors: string[] };
}

export interface SyncServerConfigurationVersionError {
  success: false;
  status: 400 | 500;
  error: string;
}

export async function syncServerConfigurationVersion(): Promise<
  SyncServerConfigurationVersionResult | SyncServerConfigurationVersionError
> {
  const latest = await ServerConfigurationVersion.findOne().sort(sortVersion);
  const [maps, cards, localizations, characters, themes, items] = await Promise.all([
    Map.find().lean(),
    AdventureCard.find().lean(),
    Localization.find().lean(),
    Character.find().lean(),
    Theme.find().lean(),
    Item.find().lean(),
  ]);

  const localizationSnapshot = (() => {
    const en: Record<string, string> = {};
    const vi: Record<string, string> = {};
    const ja: Record<string, string> = {};
    for (const loc of localizations as { key?: string; translations?: Record<string, string> }[]) {
      const translations = loc.translations ?? {};
      const key = loc.key;
      if (!key) continue;
      if (typeof translations.en === 'string' && translations.en.trim() !== '') en[key] = translations.en;
      if (typeof translations.vi === 'string' && translations.vi.trim() !== '') vi[key] = translations.vi;
      if (typeof translations.ja === 'string' && translations.ja.trim() !== '') ja[key] = translations.ja;
    }
    return { en, vi, ja };
  })();

  let packageMajor: number;
  try {
    packageMajor = getTeyvatPackageMajor();
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, status: 400, error: `Cannot read TeyvatCard/package.json version: ${msg}` };
  }

  if (latest?.version && packageMajor < (latest.version.major ?? 0)) {
    return {
      success: false,
      status: 400,
      error: `Cannot update: major version ${packageMajor} (from TeyvatCard/package.json) is lower than current ${latest.version.major}. Tăng version trong package.json trước khi sync.`,
    };
  }

  const prevCfg = latest?.configuration as Record<string, unknown> | undefined;
  const prevMaps = (prevCfg?.MapsData as { maps?: unknown[] })?.maps ?? [];
  const prevCards = (prevCfg?.CardsData as { cards?: unknown[] })?.cards ?? [];
  const prevChars = (prevCfg?.CharacterData as { characters?: unknown[] })?.characters ?? [];
  const prevThemes = (prevCfg?.themeData as { themes?: unknown[] })?.themes ?? [];
  const prevItems = (prevCfg?.itemData as { items?: unknown[] })?.items ?? [];
  const prevLocaleKeys = Object.keys((prevCfg?.localizations as { en?: Record<string, string> })?.en ?? {}).length;
  const currentCounts = {
    maps: maps.length,
    cards: cards.length,
    characters: characters.length,
    themes: themes.length,
    items: items.length,
    localeKeys: Object.keys(localizationSnapshot.en).length,
  };
  const hasNewRecords =
    currentCounts.maps > prevMaps.length ||
    currentCounts.cards > prevCards.length ||
    currentCounts.characters > prevChars.length ||
    currentCounts.themes > prevThemes.length ||
    currentCounts.items > prevItems.length ||
    currentCounts.localeKeys > prevLocaleKeys;

  const prevMinor = latest?.version?.minor ?? 0;
  const prevPatch = latest?.version?.patch ?? 0;
  const nextVersion = latest?.version
    ? hasNewRecords
      ? { major: packageMajor, minor: prevMinor + 1, patch: 0 }
      : { major: packageMajor, minor: prevMinor, patch: prevPatch + 1 }
    : { major: packageMajor, minor: 0, patch: 0 };

  const configuration = {
    MapsData: { maps },
    CardsData: buildCardsDataForConfig(cards as Record<string, unknown>[]),
    CharacterData: {
      characters: (characters as Record<string, unknown>[]).map((ch) => ({
        ...ch,
        maxLevel: (ch as Record<string, unknown>).maxLevel ?? 10,
        levelStats: Array.isArray((ch as Record<string, unknown>).levelStats) ? (ch as Record<string, unknown>).levelStats : [],
      })),
    },
    localizations: localizationSnapshot,
    themeData: { themes },
    itemData: {
      items: (items as Record<string, unknown>[]).map((i) => ({
        ...i,
        maxLevel: (i as Record<string, unknown>).maxLevel ?? 10,
        levelStats: Array.isArray((i as Record<string, unknown>).levelStats) ? (i as Record<string, unknown>).levelStats : [],
      })),
    },
  };

  const doc = await ServerConfigurationVersion.create({ version: nextVersion, configuration });

  let exportResult: { success: boolean; files: { path: string; ok: boolean; error?: string }[]; errors: string[] };
  try {
    exportResult = exportServerConfigToTeyvatData(doc.configuration as Record<string, unknown>);
  } catch (exportErr) {
    exportResult = {
      success: false,
      files: [],
      errors: [exportErr instanceof Error ? exportErr.message : String(exportErr)],
    };
  }

  const versionStr = `${doc.version?.major ?? 0}.${doc.version?.minor ?? 0}.${doc.version?.patch ?? 0}`;
  return {
    success: true,
    doc,
    versionStr,
    exportResult,
  };
}

export async function deleteServerConfigurationVersion(id: string) {
  const doc = await ServerConfigurationVersion.findByIdAndDelete(id);
  return doc;
}
