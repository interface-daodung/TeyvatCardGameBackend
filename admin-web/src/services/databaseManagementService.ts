import api from '../lib/api';

export type ScanDatabaseRequest = {
  sampleSizePerCollection?: number;
  scanAll?: boolean;
  maxDocsTotal?: number;
  maxDocsPerCollection?: number;
  includeSampleDocs?: boolean;
  sampleDocsLimit?: number;
  maxArrayElements?: number;
  maxObjectKeys?: number;
  maxDepth?: number;
  maxFieldPaths?: number;
};

export type FieldTypeSummary = {
  path: string;
  types: string[];
  typeCount: number;
  docsWithPath: number;
  examples: string[];
};

export type CollectionScanResult = {
  name: string;
  totalDocuments: number | null;
  sampleUsed: number;
  fieldSummaries: FieldTypeSummary[];
  sampleDocs: unknown[];
};

export type ScanDatabaseResponse = {
  scannedAt: string;
  collections: CollectionScanResult[];
  scanOptions: Record<string, unknown>;
};

export type MigrationUpdateManyOperation = {
  type: 'updateMany';
  collection: string;
  filter: Record<string, unknown>;
  update?: Record<string, unknown>;
  updatePipeline?: Record<string, unknown>[];
  upsert?: boolean;
};

export type ApplyMigrationRequest = {
  dryRun?: boolean;
  operations: MigrationUpdateManyOperation[];
};

export type ApplyMigrationResponse = {
  dryRun: boolean;
  results: Array<{
    collection: string;
    matchedCount: number;
    modifiedCount?: number;
    upsertedCount?: number;
  }>;
};

export const databaseManagementService = {
  scan: async (body: ScanDatabaseRequest): Promise<ScanDatabaseResponse> => {
    const { data } = await api.post<ScanDatabaseResponse>('/database-management/scan', body);
    return data;
  },

  apply: async (body: ApplyMigrationRequest): Promise<ApplyMigrationResponse> => {
    const { data } = await api.post<ApplyMigrationResponse>('/database-management/apply', body);
    return data;
  },
};

