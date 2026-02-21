import { useEffect, useState, useCallback, useRef } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowsRotate } from '@fortawesome/free-solid-svg-icons';
import { logService, AuditLog } from '../services/logService';
import { format } from 'date-fns';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Skeleton } from '../components/ui/skeleton';
import { PageHeader } from '../components/PageHeader';
import { Pagination } from '../components/Pagination';

function LogDetailTree({ log }: { log: AuditLog }) {
  const payload = {
    _id: log._id,
    adminId: log.adminId,
    action: log.action,
    resource: log.resource,
    resourceId: log.resourceId,
    details: log.details,
    content: log.content,
    ipAddress: log.ipAddress,
    createdAt: log.createdAt,
  };
  const json = JSON.stringify(payload, null, 2);
  return (
    <pre className="text-left text-xs font-mono bg-slate-900 text-slate-100 p-4 rounded-lg overflow-x-auto whitespace-pre-wrap break-words max-h-[60vh] overflow-y-auto">
      {json}
    </pre>
  );
}

const LIMIT = 20;

export default function Logs() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [limit, setLimit] = useState(LIMIT);
  const [loading, setLoading] = useState(true);
  const [detailLog, setDetailLog] = useState<AuditLog | null>(null);
  const [copyDone, setCopyDone] = useState(false);

  const [filterAction, setFilterAction] = useState('');
  const [filterResource, setFilterResource] = useState('');
  const [filterContent, setFilterContent] = useState<'' | 'info' | 'log' | 'error'>('');
  const [filterEmail, setFilterEmail] = useState('');

  useEffect(() => {
    const hash = window.location.hash.slice(1);
    if (hash) {
      try {
        setFilterEmail(decodeURIComponent(hash));
      } catch {
        setFilterEmail(hash);
      }
    }
  }, []);

  const [debouncedFilters, setDebouncedFilters] = useState({
    action: '',
    resource: '',
    content: '' as '' | 'info' | 'log' | 'error',
    email: '',
  });
  const debounceMs = 600;
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchLogs = useCallback(async (p: number, applied: { action: string; resource: string; content: '' | 'info' | 'log' | 'error'; email: string }) => {
    try {
      setLoading(true);
      const opts = {
        ...(applied.action && { action: applied.action }),
        ...(applied.resource && { resource: applied.resource }),
        ...(applied.content && { content: applied.content }),
        ...(applied.email.trim() && { email: applied.email.trim() }),
      };
      const data = await logService.getLogs(p, LIMIT, opts);
      setLogs(data.logs);
      setTotalPages(data.pagination.pages);
      setTotal(data.pagination.total);
      setLimit(data.pagination.limit);
    } catch (error) {
      console.error('Failed to fetch logs:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedFilters({
        action: filterAction,
        resource: filterResource,
        content: filterContent,
        email: filterEmail,
      });
      setPage(1);
    }, debounceMs);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [filterAction, filterResource, filterContent, filterEmail]);

  useEffect(() => {
    fetchLogs(page, debouncedFilters);
  }, [page, debouncedFilters, fetchLogs]);

  useEffect(() => {
    if (page > totalPages && totalPages >= 1) setPage(1);
  }, [totalPages, page]);

  const handleRefetch = useCallback(() => {
    fetchLogs(page, debouncedFilters);
  }, [page, debouncedFilters, fetchLogs]);

  const handleCopy = useCallback(() => {
    if (!detailLog) return;
    const payload = {
      _id: detailLog._id,
      adminId: detailLog.adminId,
      action: detailLog.action,
      resource: detailLog.resource,
      resourceId: detailLog.resourceId,
      details: detailLog.details,
      content: detailLog.content,
      ipAddress: detailLog.ipAddress,
      createdAt: detailLog.createdAt,
    };
    navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
    setCopyDone(true);
    setTimeout(() => setCopyDone(false), 2000);
  }, [detailLog]);

  if (loading && logs.length === 0) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Card>
          <CardContent className="p-6">
            <Skeleton className="h-64 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <PageHeader title="Audit Logs" description="Track all admin actions and changes" />

      <Card className="border-0 shadow-lg p-5 bg-gradient-to-br from-slate-50/80 to-blue-50/50">
        <div className="flex flex-wrap items-end gap-4">
          <div className="min-w-[200px]">
            <label className="block text-sm font-semibold text-slate-600 mb-1.5">Email</label>
            <input
              type="text"
              value={filterEmail}
              onChange={(e) => setFilterEmail(e.target.value)}
              placeholder="Nhập email"
              className="w-full rounded-lg border border-slate-200 bg-white/90 shadow-sm px-3.5 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20 focus:outline-none transition-all"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-600 mb-1.5">Action</label>
            <select
              value={filterAction}
              onChange={(e) => setFilterAction(e.target.value)}
              className="rounded-lg border border-slate-200 bg-white/90 shadow-sm pl-3.5 pr-9 py-2.5 text-sm text-slate-800 min-w-[150px] focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20 focus:outline-none transition-all appearance-none cursor-pointer hover:border-slate-300 bg-no-repeat bg-[length:1.25rem] bg-[right_0.5rem_center]"
              style={{ backgroundImage: "url(\"data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e\")" }}
            >
              <option value="">Tất cả</option>
              <option value="login">login</option>
              <option value="login_failed">login_failed</option>
              <option value="register">register</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-600 mb-1.5">Resource</label>
            <select
              value={filterResource}
              onChange={(e) => setFilterResource(e.target.value)}
              className="rounded-lg border border-slate-200 bg-white/90 shadow-sm pl-3.5 pr-9 py-2.5 text-sm text-slate-800 min-w-[130px] focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20 focus:outline-none transition-all appearance-none cursor-pointer hover:border-slate-300 bg-no-repeat bg-[length:1.25rem] bg-[right_0.5rem_center]"
              style={{ backgroundImage: "url(\"data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e\")" }}
            >
              <option value="">Tất cả</option>
              <option value="auth">auth</option>
              <option value="user">user</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-600 mb-1.5">Content</label>
            <select
              value={filterContent}
              onChange={(e) => setFilterContent((e.target.value || '') as '' | 'info' | 'log' | 'error')}
              className="rounded-lg border border-slate-200 bg-white/90 shadow-sm pl-3.5 pr-9 py-2.5 text-sm text-slate-800 min-w-[110px] focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20 focus:outline-none transition-all appearance-none cursor-pointer hover:border-slate-300 bg-no-repeat bg-[length:1.25rem] bg-[right_0.5rem_center]"
              style={{ backgroundImage: "url(\"data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e\")" }}
            >
              <option value="">Tất cả</option>
              <option value="info">info</option>
              <option value="log">log</option>
              <option value="error">error</option>
            </select>
          </div>
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={handleRefetch}
            disabled={loading}
            title="Lấy log mới (giữ nguyên bộ lọc)"
            className="shrink-0"
          >
            <FontAwesomeIcon icon={faArrowsRotate} className={loading ? 'animate-spin' : ''} />
          </Button>
        </div>
      </Card>

      <Card className="border-0 shadow-lg overflow-hidden">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-slate-50 to-blue-50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-blue-700 uppercase tracking-wider">
                    👤 Admin
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-blue-700 uppercase tracking-wider">
                    ⚡ Action
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-blue-700 uppercase tracking-wider">
                    📦 Resource
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-blue-700 uppercase tracking-wider">
                    📋 Content
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-blue-700 uppercase tracking-wider">
                    📅 Date
                  </th>
                </tr>
              </thead>
              <tbody className="bg-card divide-y divide-border">
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">
                      No logs found
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <tr key={log._id} className="hover:bg-slate-100 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-foreground">
                        {log.adminId?.email ?? '—'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge variant="outline" className="border-blue-200 text-blue-700">
                          {log.action}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                        {log.resource}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => setDetailLog(log)}
                          className="focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-400 rounded"
                        >
                          {log.content === 'error' ? (
                            <Badge variant="destructive">error</Badge>
                          ) : log.content === 'log' ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800 border border-amber-200">
                              log
                            </span>
                          ) : log.content === 'info' ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium bg-emerald-100 text-emerald-800 border border-emerald-200">
                              info
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">
                              —
                            </span>
                          )}
                        </button>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                        {format(new Date(log.createdAt), 'MMM dd, yyyy HH:mm:ss')}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {detailLog && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="log-detail-title"
        >
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setDetailLog(null)}
            aria-hidden
          />
          <div className="relative z-10 w-full max-w-2xl rounded-xl bg-card shadow-2xl border border-border overflow-hidden">
            <div className="px-6 py-4 bg-gradient-to-r from-slate-700 to-slate-800 flex items-center justify-between">
              <h2 id="log-detail-title" className="text-lg font-semibold text-white">
                Chi tiết log — {detailLog.content === 'error' ? 'error' : detailLog.content === 'log' ? 'log' : detailLog.content === 'info' ? 'info' : '—'}
              </h2>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={handleCopy}
                  className="bg-white/20 text-white hover:bg-white/30"
                >
                  {copyDone ? 'Đã copy' : 'Copy'}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setDetailLog(null)}
                  className="text-white hover:bg-white/10"
                >
                  Đóng
                </Button>
              </div>
            </div>
            <div className="p-4">
              <LogDetailTree log={detailLog} />
            </div>
          </div>
        </div>
      )}

      <Pagination page={page} totalPages={totalPages} total={total} limit={limit} onPageChange={setPage} itemLabel="logs" />
    </div>
  );
}
