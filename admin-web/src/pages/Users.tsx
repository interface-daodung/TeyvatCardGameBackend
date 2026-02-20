import { useEffect, useState, useCallback } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowsRotate } from '@fortawesome/free-solid-svg-icons';
import { userService, User, GetUsersParams } from '../services/userService';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Skeleton } from '../components/ui/skeleton';
import { PageHeader } from '../components/PageHeader';
import { Pagination } from '../components/Pagination';
import { UserRow } from '../components/users/UserRow';

const LIMIT = 20;

export default function Users() {
  const [users, setUsers] = useState<User[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [limit, setLimit] = useState(LIMIT);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [filterBanned, setFilterBanned] = useState('');

  const buildParams = useCallback((): GetUsersParams => {
    const params: GetUsersParams = {};
    if (search.trim()) params.search = search.trim();
    if (filterRole) params.role = filterRole;
    if (filterBanned === 'true' || filterBanned === 'false') params.isBanned = filterBanned as 'true' | 'false';
    return params;
  }, [search, filterRole, filterBanned]);

  const fetchUsers = useCallback(async (p: number) => {
    try {
      setLoading(true);
      const params = buildParams();
      const data = await userService.getUsers(p, LIMIT, Object.keys(params).length ? params : undefined);
      setUsers(data.users);
      setTotalPages(data.pagination.pages);
      setTotal(data.pagination.total);
      setLimit(data.pagination.limit);
    } catch (error) {
      console.error('Failed to fetch users:', error);
    } finally {
      setLoading(false);
    }
  }, [buildParams]);

  useEffect(() => {
    fetchUsers(page);
  }, [page, fetchUsers]);

  useEffect(() => {
    setPage(1);
  }, [search, filterRole, filterBanned]);

  useEffect(() => {
    if (page > totalPages && totalPages >= 1) setPage(1);
  }, [totalPages, page]);

  const handleRefresh = useCallback(() => {
    fetchUsers(page);
  }, [page, fetchUsers]);

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-32" />
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="flex items-center space-x-4">
                  <Skeleton className="h-12 w-12 rounded-full" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Users"
        description="Manage user accounts and permissions"
      />

      <Card className="border-0 shadow-lg p-5 bg-gradient-to-br from-slate-50/80 to-blue-50/50">
        <div className="flex flex-wrap items-end gap-4">
          <div className="min-w-[200px]">
            <label className="block text-sm font-semibold text-slate-600 mb-1.5">Email</label>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm theo email"
              className="w-full rounded-lg border border-slate-200 bg-white/90 shadow-sm px-3.5 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20 focus:outline-none transition-all"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-600 mb-1.5">Role</label>
            <select
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
              className="rounded-lg border border-slate-200 bg-white/90 shadow-sm pl-3.5 pr-9 py-2.5 text-sm text-slate-800 min-w-[120px] focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20 focus:outline-none transition-all appearance-none cursor-pointer hover:border-slate-300 bg-no-repeat bg-[length:1.25rem] bg-[right_0.5rem_center]"
              style={{ backgroundImage: "url(\"data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e\")" }}
            >
              <option value="">Tất cả</option>
              <option value="admin">admin</option>
              <option value="moderator">moderator</option>
              <option value="user">user</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-600 mb-1.5">Trạng thái</label>
            <select
              value={filterBanned}
              onChange={(e) => setFilterBanned(e.target.value)}
              className="rounded-lg border border-slate-200 bg-white/90 shadow-sm pl-3.5 pr-9 py-2.5 text-sm text-slate-800 min-w-[120px] focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20 focus:outline-none transition-all appearance-none cursor-pointer hover:border-slate-300 bg-no-repeat bg-[length:1.25rem] bg-[right_0.5rem_center]"
              style={{ backgroundImage: "url(\"data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e\")" }}
            >
              <option value="">Tất cả</option>
              <option value="false">Hoạt động</option>
              <option value="true">Đã khóa</option>
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

      <Card className="border-0 shadow-lg">
        <CardContent className="p-0">
          <div className="divide-y divide-border">
            {users.length === 0 ? (
              <div className="p-12 text-center text-muted-foreground">No users found</div>
            ) : (
              users.map((user) => <UserRow key={user._id} user={user} />)
            )}
          </div>
        </CardContent>
      </Card>

      <Pagination
        page={page}
        totalPages={totalPages}
        total={total}
        limit={limit}
        onPageChange={setPage}
        itemLabel="users"
      />
    </div>
  );
}
