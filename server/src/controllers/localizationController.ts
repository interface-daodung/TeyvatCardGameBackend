import { Response } from 'express';
import * as localizationService from '../services/localizationService.js';
import { AuthRequest } from '../types/index.js';
import { createLocalizationSchema, updateLocalizationSchema } from '../validators/localization.js';
import { createAuditLog } from '../utils/auditLog.js';

export const getLocalizations = async (req: AuthRequest, res: Response) => {
  try {
    const rawPage = parseInt(req.query.page as string) || 1;
    const rawLimit = parseInt(req.query.limit as string) || 6;
    const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';
    const sortBy = (req.query.sort as string) || 'key';
    const order = (req.query.order as string) === 'desc' ? -1 : 1;
    const emptyOnly = req.query.emptyOnly === 'true' || req.query.emptyOnly === '1';

    const result = await localizationService.getLocalizations({
      page: rawPage,
      limit: rawLimit,
      search,
      sortBy,
      order: order as 1 | -1,
      emptyOnly,
    });
    res.json(result);
  } catch {
    res.status(500).json({ error: 'Failed to fetch localizations' });
  }
};

export const getLocalizationByKey = async (req: AuthRequest, res: Response) => {
  try {
    const localization = await localizationService.getLocalizationByKey(req.params.key);
    if (!localization) return res.status(404).json({ error: 'Localization not found' });
    res.json({
      _id: localization._id,
      key: localization.key,
      translations: localization.translations ?? {},
      createdAt: localization.createdAt,
      updatedAt: localization.updatedAt,
    });
  } catch {
    res.status(500).json({ error: 'Failed to fetch localization' });
  }
};

export const createLocalization = async (req: AuthRequest, res: Response) => {
  try {
    const data = createLocalizationSchema.parse(req.body);
    const localization = await localizationService.createLocalization(data);
    await createAuditLog(req, 'create_localization', 'localization', localization._id.toString());
    res.status(201).json({
      _id: localization._id,
      key: localization.key,
      translations: localization.translations ?? {},
      createdAt: localization.createdAt,
      updatedAt: localization.updatedAt,
    });
  } catch (error: unknown) {
    const err = error as { name?: string; errors?: unknown };
    if (err.name === 'ZodError') return res.status(400).json({ error: err.errors });
    res.status(500).json({ error: 'Failed to create localization' });
  }
};

export const updateLocalization = async (req: AuthRequest, res: Response) => {
  try {
    const data = updateLocalizationSchema.parse(req.body);
    const translations = data.translations ?? {};
    const result = await localizationService.updateLocalization(req.params.key, translations);
    if (!result.success) return res.status(400).json({ error: 'No translations to update' });
    const { localization } = result;
    await createAuditLog(req, 'update_localization', 'localization', localization._id.toString());
    res.json({
      _id: localization._id,
      key: localization.key,
      translations: localization.translations ?? {},
      createdAt: localization.createdAt,
      updatedAt: localization.updatedAt,
    });
  } catch (error: unknown) {
    const err = error as { name?: string; errors?: unknown };
    if (err.name === 'ZodError') return res.status(400).json({ error: err.errors });
    res.status(500).json({ error: 'Failed to update localization' });
  }
};

export const deleteLocalization = async (req: AuthRequest, res: Response) => {
  try {
    const localization = await localizationService.deleteLocalization(req.params.key);
    if (!localization) return res.status(404).json({ error: 'Localization not found' });
    await createAuditLog(req, 'delete_localization', 'localization', localization._id.toString());
    res.json({ message: 'Localization deleted successfully' });
  } catch {
    res.status(500).json({ error: 'Failed to delete localization' });
  }
};

export const translateText = async (req: AuthRequest, res: Response) => {
  try {
    const body = req.body || {};
    const text = (body.text ?? body.q ?? '') as string;
    const source = (body.source ?? 'en') as string;
    const target = (body.target ?? '') as string;
    if (!String(text).trim() || !String(target).trim()) {
      return res.status(400).json({ error: 'Missing text (or q) and target language' });
    }
    const translatedText = await localizationService.translateText(text, source, target);
    res.json({ translatedText });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to translate' });
  }
};

export const getMissingKeys = async (req: AuthRequest, res: Response) => {
  try {
    const language = req.query.language as string;
    if (!language) return res.status(400).json({ error: 'Language parameter required' });
    const result = await localizationService.getMissingKeys(language);
    res.json(result);
  } catch {
    res.status(500).json({ error: 'Failed to check missing keys' });
  }
};
