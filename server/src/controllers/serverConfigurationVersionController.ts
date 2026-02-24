import { Response } from 'express';
import crypto from 'crypto';
import { ServerConfigurationVersion } from '../models/ServerConfigurationVersion.js';
import { AuthRequest } from '../types/index.js';
import { Map } from '../models/Map.js';
import { AdventureCard } from '../models/AdventureCard.js';
import { Localization } from '../models/Localization.js';
import { Character } from '../models/Character.js';
import { Theme } from '../models/Theme.js';
import { Item } from '../models/Item.js';
import { createAuditLog } from '../utils/auditLog.js';
import { exportServerConfigToTeyvatData } from '../utils/exportServerConfigToTeyvatData.js';
import { getTeyvatPackageMajor } from '../utils/teyvatPackageVersion.js';

/** Chuẩn hóa object để stringify deterministic (sort keys) */
function canonicalJson(obj: unknown): string {
  if (obj === null || typeof obj !== 'object') return JSON.stringify(obj);
  if (Array.isArray(obj)) return '[' + obj.map(canonicalJson).join(',') + ']';
  const keys = Object.keys(obj as object).sort();
  const parts = keys.map((k) => JSON.stringify(k) + ':' + canonicalJson((obj as Record<string, unknown>)[k]));
  return '{' + parts.join(',') + '}';
}

/** Hash cấu hình để so sánh */
function hashConfiguration(config: Record<string, unknown>): string {
  return crypto.createHash('sha256').update(canonicalJson(config)).digest('hex');
}

export const getServerConfigurationVersions = async (req: AuthRequest, res: Response) => {
  try {
    const list = await ServerConfigurationVersion.find()
      .sort({ 'version.major': -1, 'version.minor': -1, 'version.patch': -1, createdAt: -1 });
    res.json({ versions: list });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch server configuration versions' });
  }
};

export const getServerConfigurationVersionById = async (req: AuthRequest, res: Response) => {
  try {
    const doc = await ServerConfigurationVersion.findById(req.params.id);
    if (!doc) {
      return res.status(404).json({ error: 'Server configuration version not found' });
    }
    res.json(doc);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch server configuration version' });
  }
};

/** Lấy bản config mới nhất (theo version semver rồi createdAt) */
export const getLatestServerConfigurationVersion = async (req: AuthRequest, res: Response) => {
  try {
    const doc = await ServerConfigurationVersion.findOne()
      .sort({ 'version.major': -1, 'version.minor': -1, 'version.patch': -1, createdAt: -1 });
    if (!doc) {
      return res.status(404).json({ error: 'No server configuration version found' });
    }
    res.json(doc);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch latest server configuration version' });
  }
};

/**
 * GET /check – tạo data từ DB, hash và so sánh với snapshot mới nhất.
 * Trả về hasChanges: true nếu có thay đổi (cần update), false nếu không.
 */
export const checkServerConfigurationUpdate = async (req: AuthRequest, res: Response) => {
  try {
    const [latest, maps, cards, localizations, characters, themes, items] = await Promise.all([
      ServerConfigurationVersion.findOne()
        .sort({
          'version.major': -1,
          'version.minor': -1,
          'version.patch': -1,
          createdAt: -1,
        })
        .lean(),
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
      for (const loc of localizations as any[]) {
        const translations = (loc as any).translations ?? {};
        const key = (loc as any).key as string;
        if (!key) continue;
        if (typeof translations.en === 'string' && translations.en.trim() !== '') en[key] = translations.en;
        if (typeof translations.vi === 'string' && translations.vi.trim() !== '') vi[key] = translations.vi;
        if (typeof translations.ja === 'string' && translations.ja.trim() !== '') ja[key] = translations.ja;
      }
      return { en, vi, ja };
    })();

    const configuration: Record<string, unknown> = {
      MapsData: { maps },
      CardsData: {
        cards: (cards as any[]).map((c) => ({
          ...c,
          maxLevel: c.maxLevel ?? 10,
          levelStats: Array.isArray(c.levelStats) ? c.levelStats : [],
        })),
      },
      CharacterData: {
        characters: (characters as any[]).map((ch) => ({
          ...ch,
          maxLevel: ch.maxLevel ?? 10,
          levelStats: Array.isArray(ch.levelStats) ? ch.levelStats : [],
        })),
      },
      localizations: localizationSnapshot,
      themeData: { themes },
      itemData: {
        items: (items as any[]).map((i) => ({
          ...i,
          maxLevel: i.maxLevel ?? 10,
          levelStats: Array.isArray(i.levelStats) ? i.levelStats : [],
        })),
      },
    };

    const currentHash = hashConfiguration(configuration);
    const latestCfg = latest?.configuration as Record<string, unknown> | undefined;
    const latestHash = latestCfg ? hashConfiguration(latestCfg) : '';
    const hasChanges = !latest || currentHash !== latestHash;

    /** Phân tích thay đổi khi có cập nhật (added, updated, removed) */
    const changes: Record<string, { added: string[]; updated: string[]; removed: string[] }> = {};
    const getId = (doc: any) =>
      doc?.nameId ?? doc?.name ?? doc?.key ?? (doc?._id ? String(doc._id) : '');

    const diff = (category: string, current: any[], prev: any[]) => {
      const prevById: Record<string, any> = {};
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

    const diffLocales = () => {
      const prevEn = (latestCfg?.localizations as { en?: Record<string, string> })?.en ?? {};
      const currEn = localizationSnapshot.en;
      const added: string[] = [];
      const updated: string[] = [];
      for (const k of Object.keys(currEn)) {
        if (!(k in prevEn)) added.push(k);
        else if (prevEn[k] !== currEn[k]) updated.push(k);
      }
      const removed: string[] = [];
      for (const k of Object.keys(prevEn)) {
        if (!(k in currEn)) removed.push(k);
      }
      if (added.length || updated.length || removed.length) {
        changes.localizations = { added, updated, removed };
      }
    };

    if (hasChanges) {
      const prevMaps = (latestCfg?.MapsData as { maps?: any[] })?.maps ?? [];
      const prevCards = (latestCfg?.CardsData as { cards?: any[] })?.cards ?? [];
      const prevChars = (latestCfg?.CharacterData as { characters?: any[] })?.characters ?? [];
      const prevThemes = (latestCfg?.themeData as { themes?: any[] })?.themes ?? [];
      const prevItems = (latestCfg?.itemData as { items?: any[] })?.items ?? [];

      diff('maps', maps as any[], prevMaps);
      diff('cards', cards as any[], prevCards);
      diff('characters', characters as any[], prevChars);
      diff('themes', themes as any[], prevThemes);
      diff('items', items as any[], prevItems);
      diffLocales();
    }

    return res.json({
      success: true,
      hasChanges,
      currentHash,
      latestHash: latest ? latestHash : null,
      changes: hasChanges ? changes : undefined,
    });
  } catch (error) {
    console.error('checkServerConfigurationUpdate error:', error);
    const msg = error instanceof Error ? error.message : String(error);
    return res.status(500).json({
      success: false,
      error: `Check failed: ${msg}`,
    });
  }
};

/**
 * Gọi bằng GET để \"update\" (sync) dữ liệu cấu hình từ DB.
 * Không nhận body – chỉ đọc dữ liệu hiện tại từ các collection:
 * - MapsData: toàn bộ collection Map
 * - CardsData: toàn bộ collection AdventureCard
 * - CharacterData: toàn bộ collection Character
 * - localizations: toàn bộ collection Localization
 * - themeData: toàn bộ collection Theme (themes)
 * - itemData: toàn bộ collection Item (items)
 *
 * Trả về success / failed.
 */
export const syncServerConfigurationVersion = async (req: AuthRequest, res: Response) => {
  try {
    // Lấy bản mới nhất để tăng version
    const latest = await ServerConfigurationVersion.findOne().sort({
      'version.major': -1,
      'version.minor': -1,
      'version.patch': -1,
      createdAt: -1,
    });

    // Lấy dữ liệu hiện tại từ các collection
    const [maps, cards, localizations, characters, themes, items] = await Promise.all([
      Map.find().lean(),
      AdventureCard.find().lean(),
      Localization.find().lean(),
      Character.find().lean(),
      Theme.find().lean(),
      Item.find().lean(),
    ]);

    // Chuẩn hóa localizations thành JSON theo từng ngôn ngữ (en/vi/ja)
    const localizationSnapshot = (() => {
      const en: Record<string, string> = {};
      const vi: Record<string, string> = {};
      const ja: Record<string, string> = {};

      for (const loc of localizations as any[]) {
        const translations = (loc as any).translations ?? {};
        const key = (loc as any).key as string;
        if (!key) continue;

        if (typeof translations.en === 'string' && translations.en.trim() !== '') {
          en[key] = translations.en;
        }
        if (typeof translations.vi === 'string' && translations.vi.trim() !== '') {
          vi[key] = translations.vi;
        }
        if (typeof translations.ja === 'string' && translations.ja.trim() !== '') {
          ja[key] = translations.ja;
        }
      }

      return { en, vi, ja };
    })();

    // MAJOR: lấy từ TeyvatCard/package.json (user tăng thủ công)
    let packageMajor: number;
    try {
      packageMajor = getTeyvatPackageMajor();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return res.status(400).json({
        success: false,
        error: `Cannot read TeyvatCard/package.json version: ${msg}`,
      });
    }

    // Báo lỗi nếu major < major cũ
    if (latest?.version && packageMajor < (latest.version.major ?? 0)) {
      return res.status(400).json({
        success: false,
        error: `Cannot update: major version ${packageMajor} (from TeyvatCard/package.json) is lower than current ${latest.version.major}. Tăng version trong package.json trước khi sync.`,
      });
    }

    // Đếm bản ghi hiện tại
    const localeKeys = Object.keys(localizationSnapshot.en).length;
    const currentCounts = {
      maps: maps.length,
      cards: cards.length,
      characters: characters.length,
      themes: themes.length,
      items: items.length,
      localeKeys,
    };

    // So sánh với bản cũ để xác định MINOR (thêm bản ghi) hay PATCH (chỉ update giá trị)
    const prevCfg = latest?.configuration as Record<string, unknown> | undefined;
    const prevMaps = (prevCfg?.MapsData as { maps?: unknown[] })?.maps ?? [];
    const prevCards = (prevCfg?.CardsData as { cards?: unknown[] })?.cards ?? [];
    const prevChars = (prevCfg?.CharacterData as { characters?: unknown[] })?.characters ?? [];
    const prevThemes = (prevCfg?.themeData as { themes?: unknown[] })?.themes ?? [];
    const prevItems = (prevCfg?.itemData as { items?: unknown[] })?.items ?? [];
    const prevLocaleKeys = Object.keys((prevCfg?.localizations as { en?: Record<string, string> })?.en ?? {}).length;

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
      CardsData: {
        cards: (cards as any[]).map((c) => ({
          ...c,
          maxLevel: c.maxLevel ?? 10,
          levelStats: Array.isArray(c.levelStats) ? c.levelStats : [],
        })),
      },
      CharacterData: {
        characters: (characters as any[]).map((ch) => ({
          ...ch,
          maxLevel: ch.maxLevel ?? 10,
          levelStats: Array.isArray(ch.levelStats) ? ch.levelStats : [],
        })),
      },
      localizations: localizationSnapshot,
      themeData: { themes },
      itemData: {
        items: (items as any[]).map((i) => ({
          ...i,
          maxLevel: i.maxLevel ?? 10,
          levelStats: Array.isArray(i.levelStats) ? i.levelStats : [],
        })),
      },
    };

    const doc = await ServerConfigurationVersion.create({
      version: nextVersion,
      configuration,
    });

    await createAuditLog(
      req,
      'sync_server_configuration_version',
      'ServerConfigurationVersion',
      doc._id.toString()
    );

    // Export xuống TeyvatCard/public/data
    let exportResult: { success: boolean; files: { path: string; ok: boolean; error?: string }[]; errors: string[] } | null = null;
    try {
      const rawConfig = doc.configuration as Record<string, unknown>;
      if (rawConfig) {
        exportResult = exportServerConfigToTeyvatData(rawConfig);
        if (!exportResult.success) {
          console.error('exportServerConfigToTeyvatData errors:', exportResult.errors);
        }
      }
    } catch (exportErr) {
      console.error('exportServerConfigToTeyvatData thrown:', exportErr);
      exportResult = {
        success: false,
        files: [],
        errors: [exportErr instanceof Error ? exportErr.message : String(exportErr)],
      };
    }

    return res.json({
      success: true,
      version: doc.version,
      id: doc._id,
      export: exportResult ? { success: exportResult.success, files: exportResult.files, errors: exportResult.errors } : undefined,
    });
  } catch (error) {
    console.error('syncServerConfigurationVersion error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to sync server configuration version',
    });
  }
};

export const deleteServerConfigurationVersion = async (req: AuthRequest, res: Response) => {
  try {
    const doc = await ServerConfigurationVersion.findByIdAndDelete(req.params.id);
    if (!doc) {
      return res.status(404).json({ error: 'Server configuration version not found' });
    }
    await createAuditLog(req, 'delete_server_configuration_version', 'ServerConfigurationVersion', req.params.id);
    res.json({ message: 'Server configuration version deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete server configuration version' });
  }
};
