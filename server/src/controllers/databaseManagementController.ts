import { Response } from 'express';
import {
  applyMigrationOps as applyMigrationOpsService,
  scanDatabaseStructure as scanDatabaseStructureService,
  type ApplyMigrationRequestBody,
  type ScanDatabaseRequestBody,
} from '../services/databaseManagementService.js';
import type { AuthRequest } from '../types/index.js';

export type { ApplyMigrationRequestBody, ScanDatabaseRequestBody };

export const scanDatabaseStructure = async (req: AuthRequest, res: Response) => {
  try {
    const body = (req.body ?? {}) as ScanDatabaseRequestBody;
    const result = await scanDatabaseStructureService(body);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'Failed to scan database structure' });
  }
};

export const applyMigrationOps = async (req: AuthRequest, res: Response) => {
  try {
    const body = (req.body ?? {}) as ApplyMigrationRequestBody;
    const result = await applyMigrationOpsService(body);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'Failed to apply migration' });
  }
};

