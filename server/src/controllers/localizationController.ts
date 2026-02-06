import { Response } from 'express';
import { Localization } from '../models/Localization.js';
import { AuthRequest } from '../types/index.js';
import { createLocalizationSchema, updateLocalizationSchema } from '../validators/localization.js';
import { createAuditLog } from '../utils/auditLog.js';

export const getLocalizations = async (req: AuthRequest, res: Response) => {
  try {
    const rawPage = parseInt(req.query.page as string) || 1;
    const rawLimit = parseInt(req.query.limit as string) || 20;
    const limit = Math.min(100, Math.max(1, rawLimit));
    const total = await Localization.countDocuments();
    const pages = Math.max(1, Math.ceil(total / limit));
    const page = Math.min(pages, Math.max(1, rawPage));
    const skip = (page - 1) * limit;

    const localizations = await Localization.find()
      .sort({ key: 1 })
      .skip(skip)
      .limit(limit);

    const formatted = localizations.map((loc) => ({
      _id: loc._id,
      key: loc.key,
      values: Object.fromEntries(loc.values),
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
    // Convert Map to plain object
    res.json({
      _id: localization._id,
      key: localization.key,
      values: Object.fromEntries(localization.values),
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
      values: Object.fromEntries(localization.values),
      createdAt: localization.createdAt,
      updatedAt: localization.updatedAt,
    });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: error.errors });
    }
    res.status(500).json({ error: 'Failed to create localization' });
  }
};

export const updateLocalization = async (req: AuthRequest, res: Response) => {
  try {
    const data = updateLocalizationSchema.parse(req.body);
    const localization = await Localization.findOneAndUpdate(
      { key: req.params.key },
      { $set: { values: data.values } },
      { new: true, runValidators: true }
    );

    if (!localization) {
      return res.status(404).json({ error: 'Localization not found' });
    }

    await createAuditLog(req, 'update_localization', 'localization', localization._id.toString());

    res.json({
      _id: localization._id,
      key: localization.key,
      values: Object.fromEntries(localization.values),
      createdAt: localization.createdAt,
      updatedAt: localization.updatedAt,
    });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: error.errors });
    }
    res.status(500).json({ error: 'Failed to update localization' });
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
      .filter((loc) => !loc.values.get(language))
      .map((loc) => loc.key);

    res.json({ missingKeys, language });
  } catch (error) {
    res.status(500).json({ error: 'Failed to check missing keys' });
  }
};
