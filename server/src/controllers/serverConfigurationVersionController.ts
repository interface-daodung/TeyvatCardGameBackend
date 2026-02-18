import { Response } from 'express';
import { ServerConfigurationVersion } from '../models/ServerConfigurationVersion.js';
import { AuthRequest } from '../types/index.js';
import { Map } from '../models/Map.js';
import { AdventureCard } from '../models/AdventureCard.js';
import { Localization } from '../models/Localization.js';
import { createAuditLog } from '../utils/auditLog.js';

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
 * Gọi bằng GET để \"update\" (sync) dữ liệu cấu hình từ DB.
 * Không nhận body – chỉ đọc dữ liệu hiện tại từ các collection:
 * - MapsData: toàn bộ collection Map
 * - CardsData: toàn bộ collection AdventureCard
 * - localizations: toàn bộ collection Localization
 * - AboutData, themeData, AtlasData: giữ nguyên từ bản mới nhất (nếu có)
 *
 * Trả về success / failed.
 */
export const syncServerConfigurationVersion = async (req: AuthRequest, res: Response) => {
  try {
    // Lấy bản mới nhất để giữ AboutData, themeData, AtlasData
    const latest = await ServerConfigurationVersion.findOne().sort({
      'version.major': -1,
      'version.minor': -1,
      'version.patch': -1,
      createdAt: -1,
    });

    // Lấy dữ liệu hiện tại từ các collection
    const [maps, cards, localizations] = await Promise.all([
      Map.find().lean(),
      AdventureCard.find().lean(),
      Localization.find().lean(),
    ]);

    // Tăng version (patch) mỗi lần sync, hoặc khởi tạo 1.0.0
    const nextVersion =
      latest && latest.version
        ? {
            major: latest.version.major,
            minor: latest.version.minor,
            patch: (latest.version.patch ?? 0) + 1,
          }
        : { major: 1, minor: 0, patch: 0 };

    const configuration = {
      // Toàn bộ dữ liệu hiện tại ở dạng JSON
      MapsData: { maps },
      CardsData: { cards },
      localizations: { localizations },
      // Giữ nguyên các phần chưa triển khai logic
      AboutData: latest?.configuration?.AboutData ?? null,
      themeData: latest?.configuration?.themeData ?? null,
      AtlasData: latest?.configuration?.AtlasData ?? {},
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

    return res.json({
      success: true,
      version: doc.version,
      id: doc._id,
    });
  } catch (error) {
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
