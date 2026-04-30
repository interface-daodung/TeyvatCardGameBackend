import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import api from '../lib/api';
import { PageHeader } from '../components/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Skeleton } from '../components/ui/skeleton';
import { fadeSlideCard } from '../components/animations/motionPresets';

interface VersionDoc {
  _id: string;
  version: { major: number; minor: number; patch: number };
  configuration: Record<string, unknown>;
  createdAt: string;
}

interface CompareResponse {
  latest: VersionDoc | null;
  previous: VersionDoc | null;
  changes: Record<string, { added: string[]; updated: string[]; removed: string[] }>;
}

type DiffLine = {
  type: 'context' | 'added' | 'removed';
  text: string;
};

function versionStr(v: { major: number; minor: number; patch: number }): string {
  return `v${v.major}.${v.minor}.${v.patch}`;
}

function buildUnifiedDiffLines(previousText: string, latestText: string): DiffLine[] {
  const previousLines = previousText.split('\n');
  const latestLines = latestText.split('\n');

  const n = previousLines.length;
  const m = latestLines.length;
  const maxCells = 200_000;
  if (n * m > maxCells) {
    return latestLines.map((line) => ({ type: 'context', text: line }));
  }

  const dp: number[][] = Array.from({ length: n + 1 }, () => Array(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i -= 1) {
    for (let j = m - 1; j >= 0; j -= 1) {
      if (previousLines[i] === latestLines[j]) {
        dp[i][j] = dp[i + 1][j + 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i + 1][j], dp[i][j + 1]);
      }
    }
  }

  const diff: DiffLine[] = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (previousLines[i] === latestLines[j]) {
      diff.push({ type: 'context', text: latestLines[j] });
      i += 1;
      j += 1;
      continue;
    }
    if (dp[i + 1][j] >= dp[i][j + 1]) {
      diff.push({ type: 'removed', text: previousLines[i] });
      i += 1;
    } else {
      diff.push({ type: 'added', text: latestLines[j] });
      j += 1;
    }
  }

  while (i < n) {
    diff.push({ type: 'removed', text: previousLines[i] });
    i += 1;
  }
  while (j < m) {
    diff.push({ type: 'added', text: latestLines[j] });
    j += 1;
  }

  return diff;
}

export default function ServerConfigurationVersions() {
  const [data, setData] = useState<CompareResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedSection, setExpandedSection] = useState<string | null>('MapsData');

  const fetchCompare = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const { data: res } = await api.get<CompareResponse>('/server-configuration-versions/compare');
      setData(res);
      if (res.latest && !expandedSection) setExpandedSection('MapsData');
    } catch (e: any) {
      setError(e?.response?.data?.error ?? e?.message ?? 'Failed to load');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCompare();
  }, [fetchCompare]);

  if (loading && !data) {
    return (
      <div className="space-y-6">
        <PageHeader title="Server configuration" description="Current config JSON and changes from previous version" />
        <Skeleton className="h-64 w-full rounded-lg" />
        <Skeleton className="h-48 w-full rounded-lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <PageHeader title="Server configuration" description="Current config JSON and changes from previous version" />
        <Card>
          <CardContent className="pt-6">
            <p className="text-destructive">{error}</p>
            <Button variant="outline" className="mt-4" onClick={fetchCompare}>
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const latest = data?.latest ?? null;
  const previous = data?.previous ?? null;
  const changes = data?.changes ?? {};
  const configKeys = latest?.configuration
    ? Object.keys(latest.configuration).sort()
    : [];

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <PageHeader
          title="Server configuration"
          description="Current config JSON and changes from previous version"
        />
        <Button variant="outline" size="sm" onClick={fetchCompare} disabled={loading}>
          {loading ? 'Loading...' : 'Refresh'}
        </Button>
      </div>

      <motion.div className="space-y-6" variants={fadeSlideCard} initial="hidden" animate="visible">
      {!latest ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-muted-foreground">No config versions yet. Run sync from Dashboard to create the first version.</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="flex flex-wrap gap-2 items-center">
            <Badge variant="default" className="text-sm">
              Current config: {versionStr(latest.version)}
            </Badge>
            {previous && (
              <Badge variant="secondary">
                Compared to previous: {versionStr(previous.version)}
              </Badge>
            )}
            <span className="text-sm text-muted-foreground">
              {new Date(latest.createdAt).toLocaleString('vi-VN')}
            </span>
          </div>

          {/* Thay đổi so với bản trước */}
          {Object.keys(changes).length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Changes from previous version</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {Object.entries(changes).map(([category, diff]) => (
                  <div key={category} className="border rounded-lg p-4 bg-slate-50/50">
                    <h4 className="font-semibold text-sm capitalize mb-2">{category}</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                      {diff.added.length > 0 && (
                        <div>
                          <span className="text-green-600 font-medium">Added ({diff.added.length})</span>
                          <ul className="mt-1 list-disc list-inside text-slate-600 max-h-32 overflow-y-auto">
                            {diff.added.slice(0, 20).map((id) => (
                              <li key={id} className="truncate" title={id}>{id}</li>
                            ))}
                            {diff.added.length > 20 && (
                              <li className="text-muted-foreground">... and {diff.added.length - 20} more</li>
                            )}
                          </ul>
                        </div>
                      )}
                      {diff.updated.length > 0 && (
                        <div>
                          <span className="text-amber-600 font-medium">Updated ({diff.updated.length})</span>
                          <ul className="mt-1 list-disc list-inside text-slate-600 max-h-32 overflow-y-auto">
                            {diff.updated.slice(0, 20).map((id) => (
                              <li key={id} className="truncate" title={id}>{id}</li>
                            ))}
                            {diff.updated.length > 20 && (
                              <li className="text-muted-foreground">... and {diff.updated.length - 20} more</li>
                            )}
                          </ul>
                        </div>
                      )}
                      {diff.removed.length > 0 && (
                        <div>
                          <span className="text-red-600 font-medium">Removed ({diff.removed.length})</span>
                          <ul className="mt-1 list-disc list-inside text-slate-600 max-h-32 overflow-y-auto">
                            {diff.removed.slice(0, 20).map((id) => (
                              <li key={id} className="truncate" title={id}>{id}</li>
                            ))}
                            {diff.removed.length > 20 && (
                              <li className="text-muted-foreground">... and {diff.removed.length - 20} more</li>
                            )}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {previous && Object.keys(changes).length === 0 && (
            <Card>
              <CardContent className="pt-6">
                <p className="text-muted-foreground">No changes compared to previous version.</p>
              </CardContent>
            </Card>
          )}

          {/* Config JSON hiện tại theo từng section */}
          <Card>
            <CardHeader>
              <CardTitle>Current JSON config ({versionStr(latest.version)})</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {configKeys.map((key) => {
                const isExpanded = expandedSection === key;
                const value = latest.configuration[key];
                const json = JSON.stringify(value, null, 2);
                const previousValue = previous?.configuration?.[key];
                const previousJson = previousValue === undefined ? '' : JSON.stringify(previousValue, null, 2);
                const diffLines = previous ? buildUnifiedDiffLines(previousJson, json) : null;
                const size = json.length;
                return (
                  <div key={key} className="border rounded-lg overflow-hidden">
                    <button
                      type="button"
                      className="w-full flex items-center justify-between px-4 py-3 bg-slate-100 hover:bg-slate-200 text-left font-medium"
                      onClick={() => setExpandedSection(isExpanded ? null : key)}
                    >
                      <span>{key}</span>
                      <span className="text-sm text-muted-foreground font-normal">
                        {isExpanded ? '▼ Collapse' : '▶ Expand'} · {(size / 1024).toFixed(1)} KB
                      </span>
                    </button>
                    {isExpanded && (
                      <pre className="text-xs font-mono bg-slate-900 text-slate-100 p-4 overflow-x-auto whitespace-pre-wrap break-words max-h-[70vh] overflow-y-auto border-t">
                        {!diffLines
                          ? json
                          : diffLines.map((line, index) => {
                              const styleByType =
                                line.type === 'added'
                                  ? 'bg-green-900/40 text-green-100'
                                  : line.type === 'removed'
                                    ? 'bg-red-900/40 text-red-100'
                                    : '';
                              const prefix = line.type === 'added' ? '+ ' : line.type === 'removed' ? '- ' : '  ';
                              return (
                                <div key={`${key}-diff-${index}`} className={styleByType}>
                                  {prefix}
                                  {line.text}
                                </div>
                              );
                            })}
                      </pre>
                    )}
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </>
      )}
      </motion.div>
    </div>
  );
}
