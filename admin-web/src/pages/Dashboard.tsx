import { useEffect, useState } from 'react';
import { dashboardService, DashboardStats } from '../services/dashboardService';
import { Card, CardHeader, CardTitle } from '../components/ui/card';
import { PageHeader } from '../components/PageHeader';
import { StatCard } from '../components/StatCard';
import { RevenueChart } from '../components/dashboard/RevenueChart';
import { DashboardSkeleton } from '../components/dashboard/DashboardSkeleton';
import { Button } from '../components/ui/button';

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);
  const [lastSyncError, setLastSyncError] = useState<string | null>(null);

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

  const handleSyncServerConfig = async () => {
    try {
      setSyncing(true);
      setLastSyncError(null);

      const response = await fetch('/api/server-configuration-versions/sync', {
        method: 'GET',
        credentials: 'include',
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to sync server configuration');
      }

      setLastSyncTime(new Date().toISOString());
    } catch (error: any) {
      console.error('Failed to sync server configuration:', error);
      setLastSyncError(error?.message ?? 'Unknown error');
    } finally {
      setSyncing(false);
    }
  };

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
      {/* vị trí thêm code */}
      <div className="border rounded-lg bg-white shadow-sm p-4 space-y-2">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-slate-800">Server configuration</h2>
            <p className="text-xs text-slate-500">
              GET /api/server-configuration-versions/sync – chuẩn bị snapshot server config từ DB (Maps, Cards, Localizations).
            </p>
          </div>
          <Button size="sm" onClick={handleSyncServerConfig} disabled={syncing}>
            {syncing ? 'Updating…' : 'Update server config'}
          </Button>
        </div>
        <div className="text-xs text-slate-600 space-y-1">
          <div>
            <span className="font-medium">Last update:</span>{' '}
            {lastSyncTime ? new Date(lastSyncTime).toLocaleString() : 'Chưa cập nhật'}
          </div>
          <div>
            <span className="font-medium">Cooldown:</span>{' '}
            <span className="italic text-slate-400">
              tính năng đếm thời gian từ lần cập nhật server cuối và so sánh thay đổi DB với snapshot sẽ được bổ sung sau
            </span>
          </div>
          {lastSyncError && (
            <div className="text-red-600">
              <span className="font-medium">Error:</span> {lastSyncError}
            </div>
          )}
        </div>
      </div>
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
