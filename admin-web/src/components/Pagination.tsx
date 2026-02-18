import { Button } from './ui/button';

interface PaginationProps {
  page: number;
  totalPages: number;
  total: number;
  limit: number;
  onPageChange: (page: number) => void;
  /** Optional label e.g. "users", "payments" */
  itemLabel?: string;
}

export function Pagination({
  page,
  totalPages,
  total,
  limit,
  onPageChange,
  itemLabel = 'items',
}: PaginationProps) {
  if (total <= 0) return null;

  const start = (page - 1) * limit + 1;
  const end = Math.min(page * limit, total);

  return (
    <div className="flex items-center justify-between">
      <p className="text-sm text-muted-foreground">
        Showing {start}–{end} of {total} {itemLabel}
      </p>
      <div className="flex items-center gap-4">
        <Button
          onClick={() => onPageChange(Math.max(1, page - 1))}
          disabled={page <= 1}
          variant="outline"
          className="border-slate-200"
        >
          Previous
        </Button>
        <span className="text-sm font-medium">
          Page {page} of {totalPages}
        </span>
        <Button
          onClick={() => onPageChange(Math.min(totalPages, page + 1))}
          disabled={page >= totalPages}
          variant="outline"
          className="border-slate-200"
        >
          Next
        </Button>
      </div>
    </div>
  );
}
