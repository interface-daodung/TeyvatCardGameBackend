import mongoose from 'mongoose';

type InferredValueType =
  | 'string'
  | 'number'
  | 'boolean'
  | 'object'
  | 'array'
  | 'date'
  | 'null'
  | 'objectid'
  | 'buffer'
  | 'mixed';

export type ScanDatabaseRequestBody = {
  /** Số doc lấy mẫu mỗi collection (khi scanAll=false). */
  sampleSizePerCollection?: number;
  /** Nếu true: duyệt tối đa maxDocsTotal (có thể chậm). */
  scanAll?: boolean;
  /** Giới hạn tổng số doc giữa tất cả collection khi scanAll=true. */
  maxDocsTotal?: number;
  /** Giới hạn doc tối đa cho mỗi collection khi scanAll=true. */
  maxDocsPerCollection?: number;
  /** Có trả sample docs để UI xem nhanh. */
  includeSampleDocs?: boolean;
  sampleDocsLimit?: number;
  /** Giới hạn số phần tử array được suy luận. */
  maxArrayElements?: number;
  /** Giới hạn số key của object được duyệt. */
  maxObjectKeys?: number;
  /** Giới hạn độ sâu đệ quy khi suy luận. */
  maxDepth?: number;
  /** Giới hạn số lượng path field toàn cục (tránh nổ bộ nhớ). */
  maxFieldPaths?: number;
};

export type FieldTypeSummary = {
  path: string;
  types: InferredValueType[];
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
  scanOptions: Required<
    Pick<
      ScanDatabaseRequestBody,
      | 'sampleSizePerCollection'
      | 'scanAll'
      | 'maxDocsTotal'
      | 'maxDocsPerCollection'
      | 'includeSampleDocs'
      | 'sampleDocsLimit'
      | 'maxArrayElements'
      | 'maxObjectKeys'
      | 'maxDepth'
      | 'maxFieldPaths'
    >
  >;
};

function isObjectId(v: unknown): v is { toString: () => string; _bsontype?: string } {
  if (!v || typeof v !== 'object') return false;
  const maybe = v as any;
  return maybe._bsontype === 'ObjectID' || maybe._bsontype === 'ObjectId';
}

function getValueType(v: unknown): InferredValueType {
  if (v === null) return 'null';
  if (Array.isArray(v)) return 'array';
  if (v instanceof Date) return 'date';
  if (isObjectId(v)) return 'objectid';
  if (Buffer.isBuffer(v)) return 'buffer';
  if (typeof v === 'string') return 'string';
  if (typeof v === 'number') return 'number';
  if (typeof v === 'boolean') return 'boolean';
  if (typeof v === 'object') return 'object';
  return 'mixed';
}

function truncateExample(s: string, maxLen = 120): string {
  if (s.length <= maxLen) return s;
  return `${s.slice(0, maxLen)}…`;
}

function serializeForUI(value: unknown, depth = 0): unknown {
  if (depth > 6) return '[MaxDepth]';
  if (value === null) return null;
  if (value instanceof Date) return value.toISOString();
  if (isObjectId(value)) return value.toString();
  if (Buffer.isBuffer(value)) return `<Buffer:${value.length}>`;
  if (Array.isArray(value)) return value.slice(0, 30).map((v) => serializeForUI(v, depth + 1));
  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    const keys = Object.keys(obj).slice(0, 50);
    const out: Record<string, unknown> = {};
    for (const k of keys) out[k] = serializeForUI(obj[k], depth + 1);
    return out;
  }
  return value;
}

function valueToExampleString(value: unknown): string {
  const t = getValueType(value);
  if (t === 'date') {
    return value instanceof Date ? truncateExample(value.toISOString()) : 'date';
  }
  if (t === 'objectid') {
    if (isObjectId(value)) return truncateExample(value.toString());
    return 'objectid';
  }
  if (t === 'buffer') {
    return value instanceof Buffer ? `<Buffer:${value.length}>` : 'buffer';
  }
  if (t === 'string') return truncateExample(String(value));
  if (t === 'number') return String(value);
  if (t === 'boolean') return value ? 'true' : 'false';
  if (t === 'null') return 'null';
  // avoid huge objects/arrays in examples
  return t;
}

export type MigrationUpdateManyOperation = {
  type: 'updateMany';
  collection: string;
  filter: Record<string, unknown>;
  /** Update (classic) OR updatePipeline (Mongo update aggregation pipeline). */
  update?: Record<string, unknown>;
  updatePipeline?: Record<string, unknown>[];
  upsert?: boolean;
};

export type ApplyMigrationRequestBody = {
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

export async function scanDatabaseStructure(
  opts: ScanDatabaseRequestBody,
): Promise<ScanDatabaseResponse> {
  const sampleSizePerCollection = Math.max(1, opts.sampleSizePerCollection ?? 60);
  const scanAll = Boolean(opts.scanAll ?? false);
  const maxDocsTotal = Math.max(1, opts.maxDocsTotal ?? 3000);
  const maxDocsPerCollection = Math.max(1, opts.maxDocsPerCollection ?? 500);
  const includeSampleDocs = Boolean(opts.includeSampleDocs ?? true);
  const sampleDocsLimit = Math.max(1, opts.sampleDocsLimit ?? 3);
  const maxArrayElements = Math.max(1, opts.maxArrayElements ?? 3);
  const maxObjectKeys = Math.max(1, opts.maxObjectKeys ?? 50);
  const maxDepth = Math.max(1, opts.maxDepth ?? 8);
  const maxFieldPaths = Math.max(50, opts.maxFieldPaths ?? 2500);

  const db = mongoose.connection.db;
  if (!db) throw new Error('MongoDB connection not ready');

  const collectionsMeta = await db.listCollections().toArray();
  // filter internal collections if any
  const collectionNames = collectionsMeta
    .map((c) => c.name)
    .filter((n) => typeof n === 'string' && !n.startsWith('system.'));

  let totalDocsProcessed = 0;
  const collections: CollectionScanResult[] = [];

  for (const collectionName of collectionNames) {
    if (scanAll && totalDocsProcessed >= maxDocsTotal) break;

    const collection = db.collection(collectionName);
    let totalDocuments: number | null = null;
    try {
      // estimatedDocumentCount() thường nhanh hơn countDocuments({})
      // eslint-disable-next-line no-await-in-loop
      totalDocuments = await collection.estimatedDocumentCount();
    } catch {
      totalDocuments = null;
    }

    const docsToScan = scanAll
      ? Math.min(maxDocsPerCollection, Math.max(1, maxDocsTotal - totalDocsProcessed))
      : sampleSizePerCollection;

    let docs: unknown[] = [];
    let sampleUsed = 0;
    const sampleDocs: unknown[] = [];

    const cursor = collection.find({}).limit(docsToScan);
    for await (const doc of cursor as any) {
      docs.push(doc);
      sampleUsed += 1;
      if (includeSampleDocs && sampleDocs.length < sampleDocsLimit) sampleDocs.push(serializeForUI(doc));
      totalDocsProcessed += 1;
      if (totalDocsProcessed >= maxDocsTotal && scanAll) break;
      if (sampleUsed >= docsToScan) break;
    }

    const fieldsByPath = new Map<
      string,
      {
        types: Set<InferredValueType>;
        docsWithPath: number;
        examples: string[];
      }
    >();

    const addExample = (path: string, t: InferredValueType, value: unknown) => {
      const entry = fieldsByPath.get(path);
      if (!entry) return;
      if (t === 'object' || t === 'array') return;
      const ex = valueToExampleString(value);
      if (!ex || ex === 'object' || ex === 'array') return;
      if (entry.examples.includes(ex)) return;
      if (entry.examples.length >= 3) return;
      entry.examples.push(ex);
    };

    const record = (path: string, t: InferredValueType, value: unknown, docPaths: Set<string>) => {
      if (!fieldsByPath.has(path) && fieldsByPath.size >= maxFieldPaths) return;
      let entry = fieldsByPath.get(path);
      if (!entry) {
        entry = { types: new Set<InferredValueType>(), docsWithPath: 0, examples: [] };
        fieldsByPath.set(path, entry);
      }
      entry.types.add(t);
      docPaths.add(path);
      addExample(path, t, value);
    };

    const traverseValue = (value: unknown, path: string, depth: number, docPaths: Set<string>, visits: { n: number }) => {
      if (visits.n > 8000) return;
      visits.n += 1;
      if (depth > maxDepth) {
        record(path, 'mixed', value, docPaths);
        return;
      }

      const t = getValueType(value);
      if (t === 'null' || t === 'string' || t === 'number' || t === 'boolean' || t === 'date' || t === 'objectid' || t === 'buffer') {
        record(path, t, value, docPaths);
        return;
      }

      if (t === 'array') {
        record(path, 'array', value, docPaths);
        const arr = value as unknown[];
        const slice = arr.slice(0, maxArrayElements);
        for (const el of slice) traverseValue(el, `${path}[]`, depth + 1, docPaths, visits);
        return;
      }

      // object
      if (t === 'object') {
        record(path, 'object', value, docPaths);
        const obj = value as Record<string, unknown>;
        const keys = Object.keys(obj).slice(0, maxObjectKeys);
        for (const k of keys) {
          traverseValue(obj[k], `${path}.${k}`, depth + 1, docPaths, visits);
        }
      } else {
        record(path, 'mixed', value, docPaths);
      }
    };

    const processDoc = (doc: any) => {
      if (!doc || typeof doc !== 'object') return;
      const docPaths = new Set<string>();
      const visits = { n: 0 };
      const keys = Object.keys(doc);
      for (const key of keys.slice(0, 200)) {
        traverseValue(doc[key], key, 0, docPaths, visits);
      }
      for (const p of docPaths) {
        const entry = fieldsByPath.get(p);
        if (!entry) continue;
        entry.docsWithPath += 1;
      }
    };

    for (const doc of docs) processDoc(doc);

    const fieldSummaries: FieldTypeSummary[] = Array.from(fieldsByPath.entries())
      .map(([path, v]) => {
        const types = Array.from(v.types.values());
        types.sort();
        return {
          path,
          types,
          typeCount: types.length,
          docsWithPath: v.docsWithPath,
          examples: v.examples,
        };
      })
      .sort((a, b) => b.docsWithPath - a.docsWithPath || b.typeCount - a.typeCount || a.path.localeCompare(b.path))
      .slice(0, 2500);

    collections.push({
      name: collectionName,
      totalDocuments,
      sampleUsed,
      fieldSummaries,
      sampleDocs: includeSampleDocs ? sampleDocs.map((d) => d) : [],
    });
  }

  return {
    scannedAt: new Date().toISOString(),
    collections,
    scanOptions: {
      sampleSizePerCollection,
      scanAll,
      maxDocsTotal,
      maxDocsPerCollection,
      includeSampleDocs,
      sampleDocsLimit,
      maxArrayElements,
      maxObjectKeys,
      maxDepth,
      maxFieldPaths,
    },
  };
}

function validateCollectionName(name: string): boolean {
  return typeof name === 'string' && name.trim().length > 0 && name.length <= 120;
}

export async function applyMigrationOps(
  body: ApplyMigrationRequestBody,
): Promise<ApplyMigrationResponse> {
  const dryRun = Boolean(body.dryRun ?? true);
  const operations = Array.isArray(body.operations) ? body.operations : [];
  const db = mongoose.connection.db;
  if (!db) throw new Error('MongoDB connection not ready');

  const results: ApplyMigrationResponse['results'] = [];

  // apply sequentially (an toàn hơn và dễ theo dõi lỗi)
  for (const op of operations) {
    if (!op || op.type !== 'updateMany') continue;
    if (!validateCollectionName(op.collection)) {
      results.push({ collection: op.collection, matchedCount: 0 });
      // eslint-disable-next-line no-continue
      continue;
    }
    if (!op.filter || typeof op.filter !== 'object') {
      results.push({ collection: op.collection, matchedCount: 0 });
      // eslint-disable-next-line no-continue
      continue;
    }
    if (!op.update && !op.updatePipeline) {
      results.push({ collection: op.collection, matchedCount: 0 });
      // eslint-disable-next-line no-continue
      continue;
    }
    if (op.updatePipeline && !Array.isArray(op.updatePipeline)) {
      results.push({ collection: op.collection, matchedCount: 0 });
      // eslint-disable-next-line no-continue
      continue;
    }

    const collection = db.collection(op.collection);

    let matchedCount = 0;
    try {
      // eslint-disable-next-line no-await-in-loop
      matchedCount = await collection.countDocuments(op.filter as any);
    } catch {
      matchedCount = 0;
    }

    if (dryRun) {
      results.push({ collection: op.collection, matchedCount });
      // eslint-disable-next-line no-continue
      continue;
    }

    try {
      let updateResult: any;
      if (op.updatePipeline) {
        // MongoDB update with aggregation pipeline: updateMany(filter, pipeline, options)
        // eslint-disable-next-line no-await-in-loop
        updateResult = await collection.updateMany(op.filter as any, op.updatePipeline as any, {
          upsert: Boolean(op.upsert),
        });
      } else if (op.update) {
        // eslint-disable-next-line no-await-in-loop
        updateResult = await collection.updateMany(op.filter as any, op.update as any, {
          upsert: Boolean(op.upsert),
        });
      } else {
        results.push({ collection: op.collection, matchedCount });
        continue;
      }

      results.push({
        collection: op.collection,
        matchedCount,
        modifiedCount: updateResult?.modifiedCount ?? 0,
        upsertedCount: updateResult?.upsertedCount ?? 0,
      });
    } catch {
      results.push({ collection: op.collection, matchedCount });
    }
  }

  return { dryRun, results };
}

