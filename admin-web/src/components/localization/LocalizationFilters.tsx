import { Card } from '../ui/card';
import type { LocalizationSortField, LocalizationSortOrder } from '../../services/localizationService';

interface LocalizationFiltersProps {
  searchInput: string;
  onSearchChange: (v: string) => void;
  sortBy: LocalizationSortField;
  onSortByChange: (v: LocalizationSortField) => void;
  sortOrder: LocalizationSortOrder;
  onSortOrderChange: (v: LocalizationSortOrder) => void;
  emptyOnly: boolean;
  onEmptyOnlyChange: (v: boolean) => void;
}

export function LocalizationFilters({
  searchInput,
  onSearchChange,
  sortBy,
  onSortByChange,
  sortOrder,
  onSortOrderChange,
  emptyOnly,
  onEmptyOnlyChange,
}: LocalizationFiltersProps) {
  return (
    <Card className="border-0 shadow-lg p-4">
      <div className="flex flex-wrap items-end gap-4">
        <div className="min-w-[200px]">
          <label className="block text-sm font-medium text-muted-foreground mb-1">Search by key</label>
          <input
            type="text"
            value={searchInput}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="e.g.: menu.play (%key%)"
            className="w-full rounded border border-slate-200 px-3 py-2 text-sm focus:border-blue-300 focus:ring-1 focus:ring-blue-200"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-muted-foreground mb-1">Sort by</label>
          <select
            value={sortBy}
            onChange={(e) => onSortByChange(e.target.value as LocalizationSortField)}
            className="rounded border border-slate-200 px-3 py-2 text-sm focus:border-blue-300 focus:ring-1 focus:ring-blue-200"
          >
            <option value="key">Key</option>
            <option value="createdAt">Created time</option>
            <option value="updatedAt">Updated time</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-muted-foreground mb-1">Order</label>
          <select
            value={sortOrder}
            onChange={(e) => onSortOrderChange(e.target.value as LocalizationSortOrder)}
            className="rounded border border-slate-200 px-3 py-2 text-sm focus:border-blue-300 focus:ring-1 focus:ring-blue-200"
          >
            <option value="asc">Ascending</option>
            <option value="desc">Descending</option>
          </select>
        </div>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={emptyOnly}
            onChange={(e) => onEmptyOnlyChange(e.target.checked)}
            className="rounded border-slate-300 text-blue-600 focus:ring-blue-200"
          />
          <span className="text-sm text-muted-foreground">
            Only records with empty translations or empty values
          </span>
        </label>
      </div>
    </Card>
  );
}
