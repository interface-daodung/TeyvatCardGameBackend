import { useEffect, useState, useCallback } from 'react';
import api from '../lib/api';
import { PageHeader } from '../components/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Skeleton } from '../components/ui/skeleton';

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

function versionStr(v: { major: number; minor: number; patch: number }): string {
  return `v${v.major}.${v.minor}.${v.patch}`;
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
        <PageHeader title="Server configuration" description="Config JSON hiện tại và thay đổi so với bản trước" />
        <Skeleton className="h-64 w-full rounded-lg" />
        <Skeleton className="h-48 w-full rounded-lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <PageHeader title="Server configuration" description="Config JSON hiện tại và thay đổi so với bản trước" />
        <Card>
          <CardContent className="pt-6">
            <p className="text-destructive">{error}</p>
            <Button variant="outline" className="mt-4" onClick={fetchCompare}>
              Thử lại
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
          description="Config JSON hiện tại và thay đổi so với bản trước"
        />
        <Button variant="outline" size="sm" onClick={fetchCompare} disabled={loading}>
          {loading ? 'Đang tải...' : 'Làm mới'}
        </Button>
      </div>

      {!latest ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-muted-foreground">Chưa có bản config nào. Thực hiện sync từ Dashboard để tạo bản đầu tiên.</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="flex flex-wrap gap-2 items-center">
            <Badge variant="default" className="text-sm">
              Config hiện tại: {versionStr(latest.version)}
            </Badge>
            {previous && (
              <Badge variant="secondary">
                So với bản trước: {versionStr(previous.version)}
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
                <CardTitle>Thay đổi so với bản trước</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {Object.entries(changes).map(([category, diff]) => (
                  <div key={category} className="border rounded-lg p-4 bg-slate-50/50">
                    <h4 className="font-semibold text-sm capitalize mb-2">{category}</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                      {diff.added.length > 0 && (
                        <div>
                          <span className="text-green-600 font-medium">Thêm ({diff.added.length})</span>
                          <ul className="mt-1 list-disc list-inside text-slate-600 max-h-32 overflow-y-auto">
                            {diff.added.slice(0, 20).map((id) => (
                              <li key={id} className="truncate" title={id}>{id}</li>
                            ))}
                            {diff.added.length > 20 && (
                              <li className="text-muted-foreground">... và {diff.added.length - 20} khác</li>
                            )}
                          </ul>
                        </div>
                      )}
                      {diff.updated.length > 0 && (
                        <div>
                          <span className="text-amber-600 font-medium">Cập nhật ({diff.updated.length})</span>
                          <ul className="mt-1 list-disc list-inside text-slate-600 max-h-32 overflow-y-auto">
                            {diff.updated.slice(0, 20).map((id) => (
                              <li key={id} className="truncate" title={id}>{id}</li>
                            ))}
                            {diff.updated.length > 20 && (
                              <li className="text-muted-foreground">... và {diff.updated.length - 20} khác</li>
                            )}
                          </ul>
                        </div>
                      )}
                      {diff.removed.length > 0 && (
                        <div>
                          <span className="text-red-600 font-medium">Xóa ({diff.removed.length})</span>
                          <ul className="mt-1 list-disc list-inside text-slate-600 max-h-32 overflow-y-auto">
                            {diff.removed.slice(0, 20).map((id) => (
                              <li key={id} className="truncate" title={id}>{id}</li>
                            ))}
                            {diff.removed.length > 20 && (
                              <li className="text-muted-foreground">... và {diff.removed.length - 20} khác</li>
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
                <p className="text-muted-foreground">Không có thay đổi so với bản trước.</p>
              </CardContent>
            </Card>
          )}

          {/* Config JSON hiện tại theo từng section */}
          <Card>
            <CardHeader>
              <CardTitle>JSON config hiện tại ({versionStr(latest.version)})</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {configKeys.map((key) => {
                const isExpanded = expandedSection === key;
                const value = latest.configuration[key];
                const json = JSON.stringify(value, null, 2);
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
                        {isExpanded ? '▼ Thu gọn' : '▶ Mở'} · {(size / 1024).toFixed(1)} KB
                      </span>
                    </button>
                    {isExpanded && (
                      <pre className="text-xs font-mono bg-slate-900 text-slate-100 p-4 overflow-x-auto whitespace-pre-wrap break-words max-h-[70vh] overflow-y-auto border-t">
                        {json}
                      </pre>
                    )}
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
