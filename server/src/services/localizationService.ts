import type { PipelineStage } from 'mongoose';
import { Localization } from '../models/Localization.js';

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export interface GetLocalizationsParams {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  order?: 1 | -1;
  emptyOnly?: boolean;
}

export interface LocalizationItem {
  _id: unknown;
  key: string;
  translations: Record<string, string>;
  createdAt: Date;
  updatedAt: Date;
}

export async function getLocalizations(params: GetLocalizationsParams) {
  const rawPage = params.page ?? 1;
  const rawLimit = params.limit ?? 6;
  const limit = Math.min(100, Math.max(1, rawLimit));
  const search = typeof params.search === 'string' ? params.search.trim() : '';
  const sortBy = params.sortBy ?? 'key';
  const order = params.order ?? 1;
  const emptyOnly = params.emptyOnly === true;

  const sortField = ['key', 'createdAt', 'updatedAt'].includes(sortBy) ? sortBy : 'key';
  const sortOption: Record<string, 1 | -1> = { [sortField]: order };

  const baseMatch: Record<string, unknown> = {};
  if (search) baseMatch.key = { $regex: escapeRegex(search), $options: 'i' };

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
    Localization.aggregate<{ total: number }>([...pipeline, { $count: 'total' }]).then((r) => r[0] ?? { total: 0 }),
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

  const formatted = (dataResult as LocalizationItem[]).map((loc) => ({
    _id: loc._id,
    key: loc.key,
    translations: loc.translations ?? {},
    createdAt: loc.createdAt,
    updatedAt: loc.updatedAt,
  }));

  return { localizations: formatted, pagination: { page, limit, total, pages } };
}

export async function getLocalizationByKey(key: string) {
  const localization = await Localization.findOne({ key });
  return localization;
}

export async function createLocalization(data: { key: string; translations?: Record<string, string> }) {
  const localization = await Localization.create(data);
  return localization;
}

export async function updateLocalization(key: string, translations: Record<string, string>) {
  const updateDoc: Record<string, string> = {};
  for (const [lang, text] of Object.entries(translations)) {
    if (text != null && typeof text === 'string') updateDoc[`translations.${lang}`] = text;
  }
  if (Object.keys(updateDoc).length === 0) return { success: false as const, reason: 'no_translations' };
  const localization = await Localization.findOneAndUpdate(
    { key },
    { $set: updateDoc },
    { new: true, upsert: true, runValidators: true }
  );
  return { success: true as const, localization };
}

export async function deleteLocalization(key: string) {
  const localization = await Localization.findOneAndDelete({ key });
  return localization;
}

export async function translateText(text: string, source: string, target: string) {
  const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${source}|${target}`;
  const response = await fetch(url);
  const responseText = await response.text();
  if (!response.ok) throw new Error(responseText || 'Translation failed');
  const data = JSON.parse(responseText) as { responseData?: { translatedText?: string } };
  return data.responseData?.translatedText ?? '';
}

export async function getMissingKeys(language: string) {
  const localizations = await Localization.find();
  const missingKeys = localizations
    .filter((loc) => {
      const t = loc.translations ?? {};
      return !t[language] || t[language] === '';
    })
    .map((loc) => loc.key);
  return { missingKeys, language };
}
