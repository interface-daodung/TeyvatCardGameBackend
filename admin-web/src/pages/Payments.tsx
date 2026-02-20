import { useEffect, useState, useCallback } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowsRotate, faSort, faSortUp, faSortDown } from '@fortawesome/free-solid-svg-icons';
import { paymentService, Payment } from '../services/paymentService';
import { format } from 'date-fns';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Skeleton } from '../components/ui/skeleton';
import { PageHeader } from '../components/PageHeader';
import { Pagination } from '../components/Pagination';

const LIMIT = 20;

export default function Payments() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [limit, setLimit] = useState(LIMIT);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [searchEmail, setSearchEmail] = useState('');
  const [amountSort, setAmountSort] = useState<'asc' | 'desc' | null>(null);

  const fetchPayments = useCallback(async (p: number) => {
    try {
      setLoading(true);
      const statusParam = filterStatus === 'pending' || filterStatus === 'success' || filterStatus === 'failed' ? filterStatus : undefined;
      const data = await paymentService.getPayments(p, LIMIT, statusParam);
      setPayments(data.payments);
      setTotalPages(data.pagination.pages);
      setTotal(data.pagination.total);
      setLimit(data.pagination.limit);
    } catch (error) {
      console.error('Failed to fetch payments:', error);
    } finally {
      setLoading(false);
    }
  }, [filterStatus]);

  useEffect(() => {
    fetchPayments(page);
  }, [page, fetchPayments]);

  useEffect(() => {
    setPage(1);
  }, [filterStatus]);

  useEffect(() => {
    if (page > totalPages && totalPages >= 1) setPage(1);
  }, [totalPages, page]);

  const handleRefresh = useCallback(() => {
    fetchPayments(page);
  }, [page, fetchPayments]);

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-32" />
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
      <PageHeader title="Payments" description="Transaction history and payment records" />

      <Card className="border-0 shadow-lg p-5 bg-gradient-to-br from-slate-50/80 to-blue-50/50">
        <div className="flex flex-wrap items-end gap-4">
          <div className="min-w-[200px]">
            <label className="block text-sm font-semibold text-slate-600 mb-1.5">Email</label>
            <input
              type="text"
              value={searchEmail}
              onChange={(e) => setSearchEmail(e.target.value)}
              placeholder="Tìm theo email"
              className="w-full rounded-lg border border-slate-200 bg-white/90 shadow-sm px-3.5 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20 focus:outline-none transition-all"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-600 mb-1.5">Trạng thái</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="rounded-lg border border-slate-200 bg-white/90 shadow-sm pl-3.5 pr-9 py-2.5 text-sm text-slate-800 min-w-[130px] focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20 focus:outline-none transition-all appearance-none cursor-pointer hover:border-slate-300 bg-no-repeat bg-[length:1.25rem] bg-[right_0.5rem_center]"
              style={{ backgroundImage: "url(\"data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e\")" }}
            >
              <option value="">Tất cả</option>
              <option value="pending">pending</option>
              <option value="success">success</option>
              <option value="failed">failed</option>
            </select>
          </div>
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={handleRefresh}
            disabled={loading}
            title="Tải lại từ DB (giữ nguyên bộ lọc)"
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
                    User
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-blue-700 uppercase tracking-wider">
                    <button
                      type="button"
                      onClick={() => setAmountSort((s) => (s === null ? 'asc' : s === 'asc' ? 'desc' : null))}
                      className="inline-flex items-center gap-1.5 hover:text-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-400 rounded"
                    >
                      Amount
                      <FontAwesomeIcon icon={amountSort === 'asc' ? faSortUp : amountSort === 'desc' ? faSortDown : faSort} className="w-3.5 h-3.5 opacity-80" />
                    </button>
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-blue-700 uppercase tracking-wider">
                    Xu Received
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-blue-700 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-blue-700 uppercase tracking-wider">
                    Date
                  </th>
                </tr>
              </thead>
              <tbody className="bg-card divide-y divide-border">
                {(() => {
                  const filtered = payments.filter((p) => !searchEmail.trim() || (p.userId?.email ?? '').toLowerCase().includes(searchEmail.trim().toLowerCase()));
                  const sorted = amountSort === 'asc'
                    ? [...filtered].sort((a, b) => a.amount - b.amount)
                    : amountSort === 'desc'
                    ? [...filtered].sort((a, b) => b.amount - a.amount)
                    : filtered;
                  return sorted.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">
                      {payments.length === 0 ? 'No payments found' : 'Không có kết quả phù hợp'}
                    </td>
                  </tr>
                ) : (
                  sorted.map((payment) => (
                    <tr key={payment._id} className="hover:bg-slate-100 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-foreground">
                        {payment.userId?.email ?? 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-blue-600">
                        ${payment.amount.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                        <span className="inline-flex items-center">
                          💰 {payment.xuReceived.toLocaleString()}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge
                          variant={
                            payment.status === 'success'
                              ? 'default'
                              : payment.status === 'pending'
                              ? 'secondary'
                              : 'destructive'
                          }
                          className={
                            payment.status === 'success'
                              ? 'bg-green-100 text-green-800 border-green-200'
                              : payment.status === 'pending'
                              ? 'bg-yellow-100 text-yellow-800 border-yellow-200'
                              : ''
                          }
                        >
                          {payment.status}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                        {format(new Date(payment.createdAt), 'MMM dd, yyyy HH:mm')}
                      </td>
                    </tr>
                  )));
                })()}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Pagination page={page} totalPages={totalPages} total={total} limit={limit} onPageChange={setPage} itemLabel="payments" />
    </div>
  );
}
