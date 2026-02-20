import { useEffect, useState, useCallback } from 'react';
import { dashboardService, DashboardStats } from '../services/dashboardService';
import { Card, CardHeader, CardTitle } from '../components/ui/card';
import { PageHeader } from '../components/PageHeader';
import { StatCard } from '../components/StatCard';
import { RevenueChart } from '../components/dashboard/RevenueChart';
import { DashboardSkeleton } from '../components/dashboard/DashboardSkeleton';
import { Button } from '../components/ui/button';
import api from '../lib/api';

interface ServerConfigLatest {
  _id: string;
  version: { major: number; minor: number; patch: number };
  configuration?: {
    MapsData?: { maps?: unknown[] };
    CardsData?: { cards?: unknown[] };
    CharacterData?: { characters?: unknown[] };
    localizations?: { en?: Record<string, string>; vi?: Record<string, string>; ja?: Record<string, string> };
    themeData?: { themes?: unknown[] };
    itemData?: { items?: unknown[] };
  };
  createdAt: string;
}

function formatTimeAgo(dateStr: string): string {
  const now = new Date();
  const then = new Date(dateStr);
  const diffMs = now.getTime() - then.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffH = Math.floor(diffMin / 60);
  const diffD = Math.floor(diffH / 24);

  if (diffMin < 1) return 'vừa xong';
  if (diffMin < 60) return `${diffMin} phút trước`;
  if (diffH < 24) return `${diffH} giờ trước`;
  if (diffD < 7) return `${diffD} ngày trước`;
  return then.toLocaleDateString();
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [latestConfig, setLatestConfig] = useState<ServerConfigLatest | null>(null);
  const [lastSyncError, setLastSyncError] = useState<string | null>(null);
  const [lastExportResult, setLastExportResult] = useState<{
    success: boolean;
    files: { path: string; ok: boolean; error?: string }[];
    errors: string[];
  } | null>(null);
  const [checkStatus, setCheckStatus] = useState<'idle' | 'checking' | 'no_update' | 'has_update' | null>(null);
  const [checkCooldown, setCheckCooldown] = useState(0);
  const [checkError, setCheckError] = useState<string | null>(null);
  const [checkChanges, setCheckChanges] = useState<Record<string, { added: string[]; updated: string[]; removed: string[] }> | null>(null);

  const fetchLatestConfig = useCallback(async () => {
    try {
      const { data } = await api.get<ServerConfigLatest>('/server-configuration-versions/latest');
      setLatestConfig(data);
    } catch {
      setLatestConfig(null);
    }
  }, []);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const data = await dashboardService.getStats();
        setStats(data);
      } catch (error) {
        console.error('Failed to fetch stats:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  useEffect(() => {
    fetchLatestConfig();
    const interval = setInterval(fetchLatestConfig, 60_000);
    return () => clearInterval(interval);
  }, [fetchLatestConfig]);

  // Cooldown 5s sau khi check
  useEffect(() => {
    if (checkCooldown <= 0) return;
    const t = setInterval(() => {
      setCheckCooldown((s) => (s <= 1 ? 0 : s - 1));
    }, 1000);
    return () => clearInterval(t);
  }, [checkCooldown]);

  const handleCheckUpdate = async () => {
    try {
      setCheckStatus('checking');
      setCheckError(null);
      const { data } = await api.get<{
        success: boolean;
        hasChanges?: boolean;
        changes?: Record<string, { added: string[]; updated: string[]; removed: string[] }>;
        error?: string;
      }>('/server-configuration-versions/check');
      if (!data.success) {
        throw new Error(data.error ?? 'Check failed');
      }
      setCheckStatus(data.hasChanges ? 'has_update' : 'no_update');
      setCheckChanges(data.hasChanges && data.changes ? data.changes : null);
      setCheckCooldown(5);
    } catch (error: any) {
      const msg = error?.response?.data?.error ?? error?.message ?? 'Unknown error';
      setCheckError(msg);
      setCheckStatus('no_update');
      setCheckChanges(null);
      setCheckCooldown(5);
    }
  };

  const handleSyncServerConfig = async () => {
    try {
      setSyncing(true);
      setLastSyncError(null);
      setLastExportResult(null);

      const { data } = await api.get<{
        success: boolean;
        error?: string;
        export?: { success: boolean; files: { path: string; ok: boolean; error?: string }[]; errors: string[] };
      }>('/server-configuration-versions/sync');

      if (!data.success) {
        throw new Error(data.error || 'Failed to sync server configuration');
      }

      if (data.export) {
        setLastExportResult(data.export);
      }
      setCheckStatus(null);
      setCheckError(null);
      setCheckChanges(null);
      await fetchLatestConfig();
    } catch (error: any) {
      console.error('Failed to sync server configuration:', error);
      const errMsg = error?.response?.data?.error ?? error?.message ?? 'Unknown error';
      setLastSyncError(errMsg);
    } finally {
      setSyncing(false);
    }
  };

  const versionStr = latestConfig?.version
    ? `v${latestConfig.version.major}.${latestConfig.version.minor}.${latestConfig.version.patch}`
    : null;

  const cfg = latestConfig?.configuration;
  const snapshotCounts = cfg
    ? {
        maps: cfg.MapsData?.maps?.length ?? 0,
        cards: cfg.CardsData?.cards?.length ?? 0,
        characters: cfg.CharacterData?.characters?.length ?? 0,
        localizations: Object.keys(cfg.localizations?.en ?? {}).length,
        themes: cfg.themeData?.themes?.length ?? 0,
        items: cfg.itemData?.items?.length ?? 0,
      }
    : null;

  if (loading) return <DashboardSkeleton />;

  if (!stats) {
    return (
      <div className="p-6">
        <Card className="border-0">
          <CardHeader>
            <CardTitle className="text-destructive">Failed to load dashboard</CardTitle>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const statCards = [
    { title: 'Total Users', value: stats.totalUsers.toLocaleString(), icon: '👥', gradient: 'from-slate-100 to-blue-100', textColor: 'text-blue-700' },
    { title: 'Total Revenue', value: `$${stats.totalRevenue.toFixed(2)}`, icon: '💰', gradient: 'from-blue-100 to-blue-200', textColor: 'text-blue-800' },
    { title: 'Total Payments', value: stats.totalPayments.toLocaleString(), icon: '💳', gradient: 'from-slate-100 to-blue-100', textColor: 'text-slate-700' },
    { title: 'Characters', value: stats.totalCharacters.toLocaleString(), icon: '⚔️', gradient: 'from-slate-100 to-blue-100', textColor: 'text-blue-700' },
    { title: 'Equipment', value: stats.totalEquipment.toLocaleString(), icon: '🛡️', gradient: 'from-blue-100 to-blue-200', textColor: 'text-blue-800' },
    { title: 'Maps', value: stats.totalMaps.toLocaleString(), icon: '🗺️', gradient: 'from-slate-100 to-blue-100', textColor: 'text-slate-700' },
  ];

  return (
    <div className="p-6 space-y-6 bg-gradient-to-br from-background to-slate-50/50 min-h-screen">
      <PageHeader
        title="Dashboard"
        description="Overview of your game statistics"
      />

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {statCards.map((stat, index) => (
          <StatCard key={index} {...stat} />
        ))}
      </div>
      <Card className="overflow-hidden border-0 shadow-lg">
        <div className="bg-gradient-to-r from-slate-50 to-blue-50/50 px-6 py-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-800">Server Configuration Snapshot</h2>
              <p className="text-sm text-slate-500 mt-0.5">
                Snapshot từ DB: Maps, Cards, Characters, Items, Themes, Localizations
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              {checkStatus !== 'has_update' && (
                <Button
                  size="sm"
                  variant="default"
                  className="bg-green-600 hover:bg-green-700 text-white"
                  onClick={handleCheckUpdate}
                  disabled={checkStatus === 'checking' || checkCooldown > 0}
                >
                  {checkStatus === 'checking'
                    ? 'Đang kiểm tra…'
                    : checkCooldown > 0
                      ? `Check update (${checkCooldown}s)`
                      : 'Check update'}
                </Button>
              )}
              {checkStatus === 'has_update' && (
                <Button
                  size="sm"
                  onClick={() => {
                    if (window.confirm('Xác nhận đồng bộ server config? Dữ liệu từ DB sẽ được snapshot và export xuống TeyvatCard/public/data.')) {
                      handleSyncServerConfig();
                    }
                  }}
                  disabled={syncing}
                >
                  {syncing ? 'Updating…' : 'Update server config'}
                </Button>
              )}
            </div>
          </div>
          {(checkStatus === 'no_update' || checkStatus === 'has_update') && (
            <p className="text-sm mt-2 text-slate-600">
              {checkStatus === 'no_update' ? (
                <span className="text-amber-600 font-medium">Chưa có cập nhật</span>
              ) : (
                <span className="text-green-600 font-medium">Có cập nhật – bấm &quot;Update server config&quot; để đồng bộ</span>
              )}
            </p>
          )}
          {checkStatus === 'has_update' && checkChanges && Object.keys(checkChanges).length > 0 && (
            <div className="mt-3 rounded-lg bg-slate-50 border border-slate-200 px-4 py-3 text-sm space-y-2">
              <p className="font-medium text-slate-700">Thay đổi:</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {Object.entries(checkChanges).map(([cat, { added, updated, removed }]) => (
                  <div key={cat} className="rounded bg-white p-2 border border-slate-100">
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1.5">
                      {cat === 'maps' ? '🗺️ Maps' : cat === 'cards' ? '🃏 Cards' : cat === 'characters' ? '⚔️ Characters' : cat === 'themes' ? '🎨 Themes' : cat === 'items' ? '📦 Items' : cat === 'localizations' ? '🌐 Locales' : cat}
                    </p>
                    {added.length > 0 && (
                      <p className="text-xs text-green-700">
                        <span className="font-medium">Thêm mới ({added.length}):</span>{' '}
                        <span className="text-slate-600">{added.slice(0, 5).join(', ')}{added.length > 5 ? ` +${added.length - 5}` : ''}</span>
                      </p>
                    )}
                    {updated.length > 0 && (
                      <p className="text-xs text-blue-700 mt-0.5">
                        <span className="font-medium">Cập nhật ({updated.length}):</span>{' '}
                        <span className="text-slate-600">{updated.slice(0, 5).join(', ')}{updated.length > 5 ? ` +${updated.length - 5}` : ''}</span>
                      </p>
                    )}
                    {(removed?.length ?? 0) > 0 && (
                      <p className="text-xs text-red-700 mt-0.5">
                        <span className="font-medium">Đã xóa ({removed.length}):</span>{' '}
                        <span className="text-slate-600">{removed.slice(0, 5).join(', ')}{removed.length > 5 ? ` +${removed.length - 5}` : ''}</span>
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
          {checkError && (
            <p className="text-sm mt-2 text-red-600">Check lỗi: {checkError}</p>
          )}
        </div>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="rounded-lg bg-slate-50/80 p-3">
              <p className="text-xs text-slate-500 uppercase tracking-wider">Version</p>
              <p className="text-lg font-semibold text-slate-800 mt-0.5">
                {versionStr ?? '—'}
              </p>
            </div>
            <div className="rounded-lg bg-slate-50/80 p-3">
              <p className="text-xs text-slate-500 uppercase tracking-wider">Last update</p>
              <p className="text-sm font-medium text-slate-800 mt-0.5">
                {latestConfig?.createdAt
                  ? new Date(latestConfig.createdAt).toLocaleString('vi-VN', {
                      dateStyle: 'short',
                      timeStyle: 'short',
                    })
                  : 'Chưa có'}
              </p>
            </div>
            <div className="rounded-lg bg-slate-50/80 p-3">
              <p className="text-xs text-slate-500 uppercase tracking-wider">Đã cập nhật</p>
              <p className="text-sm font-medium text-blue-600 mt-0.5">
                {latestConfig?.createdAt ? formatTimeAgo(latestConfig.createdAt) : '—'}
              </p>
            </div>
            <div className="rounded-lg bg-slate-50/80 p-3">
              <p className="text-xs text-slate-500 uppercase tracking-wider">Snapshot ID</p>
              <p className="text-xs font-mono text-slate-600 mt-0.5 truncate" title={latestConfig?._id}>
                {latestConfig?._id ? `${String(latestConfig._id).slice(-8)}` : '—'}
              </p>
            </div>
          </div>

          {snapshotCounts && (
            <div className="flex flex-wrap gap-2">
              <span className="text-xs text-slate-500">Nội dung snapshot:</span>
              <div className="flex flex-wrap gap-2">
                {[
                  { label: 'Maps', value: snapshotCounts.maps, icon: '🗺️' },
                  { label: 'Cards', value: snapshotCounts.cards, icon: '🃏' },
                  { label: 'Characters', value: snapshotCounts.characters, icon: '⚔️' },
                  { label: 'Items', value: snapshotCounts.items, icon: '📦' },
                  { label: 'Themes', value: snapshotCounts.themes, icon: '🎨' },
                  { label: 'Locale keys', value: snapshotCounts.localizations, icon: '🌐' },
                ].map(({ label, value, icon }) => (
                  <span
                    key={label}
                    className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700"
                  >
                    <span>{icon}</span>
                    <span>{label}:</span>
                    <span className="text-slate-900">{value}</span>
                  </span>
                ))}
              </div>
            </div>
          )}

          {lastExportResult && (
            <div className="rounded-lg bg-slate-50 border border-slate-200 px-4 py-3 text-sm space-y-2">
              <p className="font-medium text-slate-700">
                Export TeyvatCard/public/data:{' '}
                <span className={lastExportResult.success ? 'text-green-600' : 'text-amber-600'}>
                  {lastExportResult.success ? '✓ Thành công' : '⚠ Một số file lỗi'}
                </span>
              </p>
              <div className="flex flex-wrap gap-2">
                {lastExportResult.files.map((f) => (
                  <span
                    key={f.path}
                    className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs ${
                      f.ok ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}
                    title={f.error}
                  >
                    {f.ok ? '✓' : '✗'} {f.path}
                  </span>
                ))}
              </div>
              {lastExportResult.errors.length > 0 && (
                <div className="text-red-600 text-xs font-mono mt-1">
                  {lastExportResult.errors.map((e, i) => (
                    <div key={i}>{e}</div>
                  ))}
                </div>
              )}
            </div>
          )}

          {lastSyncError && (
            <div className="rounded-lg bg-red-50 text-red-700 px-4 py-2 text-sm">
              <span className="font-medium">Error:</span> {lastSyncError}
            </div>
          )}
        </div>
      </Card>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RevenueChart data={stats.revenueByDate} />
        <RevenueChart
          data={stats.usersByDate}
          title="User Registrations"
          description="New user signups over time"
          dataKey="count"
          color="hsl(215, 20%, 45%)"
          name="New Users"
        />
      </div>
    </div>
  );
}
