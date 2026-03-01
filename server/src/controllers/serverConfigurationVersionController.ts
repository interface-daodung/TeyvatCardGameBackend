import { Response } from 'express';
import * as serverConfigService from '../services/serverConfigurationVersionService.js';
import { AuthRequest } from '../types/index.js';
import { createAuditLog } from '../utils/auditLog.js';
import { notificationManager } from '../utils/notificationManager.js';

export const getServerConfigurationVersions = async (req: AuthRequest, res: Response) => {
  try {
    const result = await serverConfigService.getServerConfigurationVersions();
    res.json(result);
  } catch {
    res.status(500).json({ error: 'Failed to fetch server configuration versions' });
  }
};

export const getServerConfigurationVersionById = async (req: AuthRequest, res: Response) => {
  try {
    const doc = await serverConfigService.getServerConfigurationVersionById(req.params.id);
    if (!doc) return res.status(404).json({ error: 'Server configuration version not found' });
    res.json(doc);
  } catch {
    res.status(500).json({ error: 'Failed to fetch server configuration version' });
  }
};

export const getLatestServerConfigurationVersion = async (req: AuthRequest, res: Response) => {
  try {
    const doc = await serverConfigService.getLatestServerConfigurationVersion();
    if (!doc) return res.status(404).json({ error: 'No server configuration version found' });
    res.json(doc);
  } catch {
    res.status(500).json({ error: 'Failed to fetch latest server configuration version' });
  }
};

export const getServerConfigurationCompare = async (req: AuthRequest, res: Response) => {
  try {
    const result = await serverConfigService.getServerConfigurationCompare();
    res.json(result);
  } catch (error) {
    console.error('getServerConfigurationCompare error:', error);
    res.status(500).json({ error: 'Failed to compare server configuration versions' });
  }
};

export const checkServerConfigurationUpdate = async (req: AuthRequest, res: Response) => {
  try {
    const result = await serverConfigService.checkServerConfigurationUpdate();
    res.json(result);
  } catch (error) {
    console.error('checkServerConfigurationUpdate error:', error);
    const msg = error instanceof Error ? error.message : String(error);
    res.status(500).json({ success: false, error: `Check failed: ${msg}` });
  }
};

export const syncServerConfigurationVersion = async (req: AuthRequest, res: Response) => {
  try {
    const result = await serverConfigService.syncServerConfigurationVersion();
    if (!result.success) {
      return res.status(result.status).json({ success: false, error: result.error });
    }

    const { doc, versionStr, exportResult } = result;
    await createAuditLog(req, 'sync_server_configuration_version', 'ServerConfigurationVersion', doc._id.toString());

    if (exportResult.success) {
      notificationManager.sendNotification({
        name: 'Server configuration',
        icon: '✅',
        notif: `Đã tạo server config thành công (v${versionStr})`,
        path: '/server-configuration-versions',
      });
      await createAuditLog(
        req,
        'server_config_export_success',
        'ServerConfigurationVersion',
        doc._id.toString(),
        { version: versionStr, message: 'Đã tạo server config (JSON) thành công' },
        undefined,
        'info'
      );
    } else {
      await createAuditLog(
        req,
        'server_config_export_error',
        'ServerConfigurationVersion',
        doc._id.toString(),
        { errors: exportResult.errors, message: 'Không ghi được file JSON hoặc export lỗi' },
        undefined,
        'error'
      );
    }

    res.json({
      success: true,
      version: doc.version,
      id: doc._id,
      export: { success: exportResult.success, files: exportResult.files, errors: exportResult.errors },
    });
  } catch (error) {
    console.error('syncServerConfigurationVersion error:', error);
    const errMsg = error instanceof Error ? error.message : String(error);
    await createAuditLog(
      req,
      'server_config_sync_error',
      'ServerConfigurationVersion',
      undefined,
      { message: 'Sync server configuration thất bại', error: errMsg },
      undefined,
      'error'
    );
    res.status(500).json({
      success: false,
      error: 'Failed to sync server configuration version',
    });
  }
};

export const deleteServerConfigurationVersion = async (req: AuthRequest, res: Response) => {
  try {
    const doc = await serverConfigService.deleteServerConfigurationVersion(req.params.id);
    if (!doc) return res.status(404).json({ error: 'Server configuration version not found' });
    await createAuditLog(req, 'delete_server_configuration_version', 'ServerConfigurationVersion', req.params.id);
    res.json({ message: 'Server configuration version deleted successfully' });
  } catch {
    res.status(500).json({ error: 'Failed to delete server configuration version' });
  }
};
