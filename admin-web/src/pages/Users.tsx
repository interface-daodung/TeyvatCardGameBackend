import { useEffect, useState } from 'react';
import { userService, User } from '../services/userService';
import { Card, CardContent } from '../components/ui/card';
import { Skeleton } from '../components/ui/skeleton';
import { PageHeader } from '../components/PageHeader';
import { Pagination } from '../components/Pagination';
import { UserRow } from '../components/users/UserRow';

export default function Users() {
  const [users, setUsers] = useState<User[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [limit, setLimit] = useState(20);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoading(true);
        const data = await userService.getUsers(page, 20);
        setUsers(data.users);
        setTotalPages(data.pagination.pages);
        setTotal(data.pagination.total);
        setLimit(data.pagination.limit);
      } catch (error) {
        console.error('Failed to fetch users:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, [page]);

  useEffect(() => {
    if (page > totalPages && totalPages >= 1) setPage(1);
  }, [totalPages, page]);

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
