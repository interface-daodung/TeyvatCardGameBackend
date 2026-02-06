import { useEffect, useState } from 'react';
import { localizationService, Localization } from '../services/localizationService';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Skeleton } from '../components/ui/skeleton';

export default function LocalizationPage() {
  const [localizations, setLocalizations] = useState<Localization[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [limit, setLimit] = useState(20);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLocalizations = async () => {
      try {
        setLoading(true);
        const data = await localizationService.getLocalizations(page, 20);
        setLocalizations(data.localizations);
        setTotalPages(data.pagination.pages);
        setTotal(data.pagination.total);
        setLimit(data.pagination.limit);
      } catch (error) {
        console.error('Failed to fetch localizations:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchLocalizations();
  }, [page]);

  useEffect(() => {
    if (page > totalPages && totalPages >= 1) setPage(1);
  }, [totalPages, page]);

  if (loading) {
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
      <div>
        <h1 className="text-4xl font-bold bg-gradient-to-r from-slate-600 to-blue-600 bg-clip-text text-transparent mb-2">
          Localization
        </h1>
        <p className="text-muted-foreground">Manage multi-language translations</p>
      </div>

      <Card className="border-0 shadow-lg overflow-hidden">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-slate-50 to-blue-50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-blue-700 uppercase tracking-wider">
                    Key
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-blue-700 uppercase tracking-wider">
                    🇬🇧 English
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-blue-700 uppercase tracking-wider">
                    🇻🇳 Vietnamese
                  </th>
                </tr>
              </thead>
              <tbody className="bg-card divide-y divide-border">
                {localizations.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-6 py-12 text-center text-muted-foreground">
                      No localizations found
                    </td>
                  </tr>
                ) : (
                localizations.map((loc) => (
                  <tr key={loc._id} className="hover:bg-slate-100 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-foreground">
                      {loc.key}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                      {loc.values.en || <span className="text-destructive">-</span>}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                      {loc.values.vi || <span className="text-destructive">-</span>}
                    </td>
                  </tr>
                )))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {total > 0 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {(page - 1) * limit + 1}–{Math.min(page * limit, total)} of {total} localizations
          </p>
          <div className="flex items-center gap-4">
            <Button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
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
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              variant="outline"
              className="border-slate-200"
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
