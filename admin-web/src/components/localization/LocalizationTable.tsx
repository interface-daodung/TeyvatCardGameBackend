import { CardContent } from '../ui/card';
import { Button } from '../ui/button';
import type { Localization } from '../../services/localizationService';

function getPrimaryValue(values: Record<string, string> | undefined): string {
  if (!values) return '-';
  return values.en ?? values.vi ?? Object.values(values)[0] ?? '-';
}

function getLangEntries(values: Record<string, string> | undefined): [string, string][] {
  if (!values || Object.keys(values).length === 0) return [];
  const order = ['en', 'vi', 'ja', 'zh', 'ko', 'fr', 'de', 'es'];
  const entries = Object.entries(values).filter(([, v]) => v != null && v !== '');
  return entries.sort(([a], [b]) => {
    const ia = order.indexOf(a);
    const ib = order.indexOf(b);
    if (ia >= 0 && ib >= 0) return ia - ib;
    if (ia >= 0) return -1;
    if (ib >= 0) return 1;
    return a.localeCompare(b);
  });
}

interface LocalizationTableProps {
  items: Localization[];
  expandedKeys: Set<string>;
  onToggleExpand: (key: string) => void;
  onEdit: (loc: Localization) => void;
  onDelete: (loc: Localization) => void;
}

export function LocalizationTable({
  items,
  expandedKeys,
  onToggleExpand,
  onEdit,
  onDelete,
}: LocalizationTableProps) {
  return (
    <CardContent className="p-0">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gradient-to-r from-slate-50 to-blue-50">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-semibold text-blue-700 uppercase tracking-wider">
                Key | Preview
              </th>
              <th className="px-6 py-4 text-right text-xs font-semibold text-blue-700 uppercase tracking-wider w-32">
                Thao tác
              </th>
            </tr>
          </thead>
          <tbody className="bg-card divide-y divide-border">
            {items.length === 0 ? (
              <tr>
                <td colSpan={2} className="px-6 py-12 text-center text-muted-foreground">
                  No localizations found
                </td>
              </tr>
            ) : (
              items.map((loc) => {
                const expanded = expandedKeys.has(loc.key);
                const entries = getLangEntries(loc.translations);
                const primaryValue = getPrimaryValue(loc.translations);
                return (
                  <tr key={loc._id} className="hover:bg-slate-50 transition-colors group">
                    <td className="px-6 py-3">
                      <div className="flex items-start gap-2">
                        <button
                          type="button"
                          onClick={() => onToggleExpand(loc.key)}
                          className="mt-0.5 text-slate-500 hover:text-slate-700 shrink-0"
                          aria-label={expanded ? 'Thu gọn' : 'Mở rộng'}
                        >
                          {expanded ? '▼' : '▶'}
                        </button>
                        <div className="min-w-0">
                          <span className="font-semibold text-foreground">{loc.key}</span>
                          <span className="text-slate-400 mx-2">|</span>
                          <span className="text-muted-foreground">
                            {primaryValue || <span className="text-destructive">-</span>}
                          </span>
                          {expanded && entries.length > 0 && (
                            <div className="mt-2 ml-6 text-sm text-muted-foreground font-mono space-y-0.5">
                              {entries.map(([lang, val], i) => (
                                <div key={lang}>
                                  {i === entries.length - 1 ? '└' : '├'} {lang}: {val}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-3 text-right align-top">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onEdit(loc)}
                          className="border-slate-200"
                        >
                          Sửa
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onDelete(loc)}
                          className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                        >
                          Xóa
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </CardContent>
  );
}
