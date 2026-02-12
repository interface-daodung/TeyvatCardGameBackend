import { Response } from 'express';
import type { PipelineStage } from 'mongoose';
import { Localization } from '../models/Localization.js';
import { AuthRequest } from '../types/index.js';
import { createLocalizationSchema, updateLocalizationSchema } from '../validators/localization.js';
import { createAuditLog } from '../utils/auditLog.js';

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export const getLocalizations = async (req: AuthRequest, res: Response) => {
  try {
    const rawPage = parseInt(req.query.page as string) || 1;
    const rawLimit = parseInt(req.query.limit as string) || 6;
    const limit = Math.min(100, Math.max(1, rawLimit));
    const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';
    const sortBy = (req.query.sort as string) || 'key';
    const order = (req.query.order as string) === 'desc' ? -1 : 1;
    const emptyOnly = req.query.emptyOnly === 'true' || req.query.emptyOnly === '1';

    const sortField = ['key', 'createdAt', 'updatedAt'].includes(sortBy) ? sortBy : 'key';
    const sortOption: Record<string, 1 | -1> = { [sortField]: order as 1 | -1 };

    const baseMatch: Record<string, unknown> = {};
    if (search) {
      baseMatch.key = { $regex: escapeRegex(search), $options: 'i' };
    }

    const pipeline: PipelineStage[] = [{ $match: baseMatch }];

    if (emptyOnly) {
      pipeline.push({
        $addFields: {
          _hasEmpty: {
            $or: [
              { $eq: [{ $size: { $objectToArray: { $ifNull: ['$translations', {}] } } }, 0] },
              {
                $gt: [
                  {
                    $size: {
                      $filter: {
                        input: { $objectToArray: { $ifNull: ['$translations', {}] } },
                        as: 't',
                        cond: { $or: [{ $eq: ['$$t.v', null] }, { $eq: ['$$t.v', ''] }] },
                      },
                    },
                  },
                  0,
                ],
              },
            ],
          },
        },
      });
      pipeline.push({ $match: { _hasEmpty: true } });
    }

    const [metaResult, dataResult] = await Promise.all([
      Localization.aggregate<{ total: number }>([
        ...pipeline,
        { $count: 'total' },
      ]).then((r) => r[0] ?? { total: 0 }),
      Localization.aggregate([
        ...pipeline,
        { $sort: sortOption },
        { $skip: (Math.max(1, rawPage) - 1) * limit },
        { $limit: limit },
        { $project: { _hasEmpty: 0 } },
      ]),
    ]);

    const total = metaResult.total ?? 0;
    const pages = Math.max(1, Math.ceil(total / limit));
    const page = Math.min(pages, Math.max(1, rawPage));

    const formatted = (dataResult as { _id: unknown; key: string; translations?: Record<string, string>; createdAt: Date; updatedAt: Date }[]).map((loc) => ({
      _id: loc._id,
      key: loc.key,
      translations: loc.translations ?? {},
      createdAt: loc.createdAt,
      updatedAt: loc.updatedAt,
    }));

    res.json({
      localizations: formatted,
      pagination: { page, limit, total, pages },
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch localizations' });
  }
};

export const getLocalizationByKey = async (req: AuthRequest, res: Response) => {
  try {
    const localization = await Localization.findOne({ key: req.params.key });
    if (!localization) {
      return res.status(404).json({ error: 'Localization not found' });
    }
    res.json({
      _id: localization._id,
      key: localization.key,
      translations: localization.translations ?? {},
      createdAt: localization.createdAt,
      updatedAt: localization.updatedAt,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch localization' });
  }
};

export const createLocalization = async (req: AuthRequest, res: Response) => {
  try {
    const data = createLocalizationSchema.parse(req.body);
    const localization = await Localization.create(data);

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
    if (err.name === 'ZodError') {
      return res.status(400).json({ error: err.errors });
    }
    res.status(500).json({ error: 'Failed to create localization' });
  }
};

/**
 * Update (partial) với $set + upsert:
 * - Ngôn ngữ mới → thêm vào translations
 * - Ngôn ngữ đã có → ghi đè
 * - Document chưa tồn tại → tạo mới (upsert)
 */
export const updateLocalization = async (req: AuthRequest, res: Response) => {
  try {
    const data = updateLocalizationSchema.parse(req.body);
    const translations = data.translations ?? {};

    const updateDoc: Record<string, string> = {};
    for (const [lang, text] of Object.entries(translations)) {
      if (text != null && typeof text === 'string') {
        updateDoc[`translations.${lang}`] = text;
      }
    }

    if (Object.keys(updateDoc).length === 0) {
      return res.status(400).json({ error: 'No translations to update' });
    }

    const localization = await Localization.findOneAndUpdate(
      { key: req.params.key },
      { $set: updateDoc },
      { new: true, upsert: true, runValidators: true }
    );

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
    if (err.name === 'ZodError') {
      return res.status(400).json({ error: err.errors });
    }
    res.status(500).json({ error: 'Failed to update localization' });
  }
};

export const deleteLocalization = async (req: AuthRequest, res: Response) => {
  try {
    const localization = await Localization.findOneAndDelete({ key: req.params.key });
    if (!localization) {
      return res.status(404).json({ error: 'Localization not found' });
    }
    await createAuditLog(req, 'delete_localization', 'localization', localization._id.toString());
    res.json({ message: 'Localization deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete localization' });
  }
};

export const translateText = async (req: AuthRequest, res: Response) => {
  try {
    const body = req.body || {};
    const text = body.text ?? body.q ?? '';
    const source = body.source ?? 'en';
    const target = body.target ?? '';
    if (!String(text).trim() || !String(target).trim()) {
      return res.status(400).json({ error: 'Missing text (or q) and target language' });
    }
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${source}|${target}`;
    const response = await fetch(url);
    const responseText = await response.text();
    if (!response.ok) {
      return res.status(response.status).json({ error: responseText || 'Translation failed' });
    }
    const data = JSON.parse(responseText) as { responseData?: { translatedText?: string } };
    const translatedText = data.responseData?.translatedText ?? '';
    res.json({ translatedText });
  } catch (error) {
    res.status(500).json({ error: 'Failed to translate' });
  }
};

export const getMissingKeys = async (req: AuthRequest, res: Response) => {
  try {
    const language = req.query.language as string;
    if (!language) {
      return res.status(400).json({ error: 'Language parameter required' });
    }

    const localizations = await Localization.find();
    const missingKeys = localizations
      .filter((loc) => {
        const t = loc.translations ?? {};
        return !t[language] || t[language] === '';
      })
      .map((loc) => loc.key);

    res.json({ missingKeys, language });
  } catch (error) {
    res.status(500).json({ error: 'Failed to check missing keys' });
  }
};
