const CARD_TYPES = ['all', 'weapon', 'enemy', 'food', 'trap', 'treasure', 'bomb', 'coin', 'empty'] as const;
const SORT_OPTIONS = ['type', 'rarity', 'name'] as const;

interface AdventureCardsFiltersProps {
  typeFilter: string;
  onTypeFilterChange: (v: string) => void;
  sortBy: 'type' | 'rarity' | 'name';
  onSortByChange: (v: 'type' | 'rarity' | 'name') => void;
  totalCount: number;
}

export function AdventureCardsFilters({
  typeFilter,
  onTypeFilterChange,
  sortBy,
  onSortByChange,
  totalCount,
}: AdventureCardsFiltersProps) {
  return (
    <div className="flex flex-wrap gap-4 items-center">
      <div className="flex items-center gap-2">
        <label htmlFor="type-filter" className="text-sm font-medium text-muted-foreground">
          Type:
        </label>
        <select
          id="type-filter"
          value={typeFilter}
          onChange={(e) => onTypeFilterChange(e.target.value)}
          className="px-3 py-2 text-sm border border-input rounded-md bg-background"
        >
          {CARD_TYPES.map((t) => (
            <option key={t} value={t}>
              {t === 'all' ? 'All' : t}
            </option>
          ))}
        </select>
      </div>
      <div className="flex items-center gap-2">
        <label htmlFor="sort-by" className="text-sm font-medium text-muted-foreground">
          Sort by:
        </label>
        <select
          id="sort-by"
          value={sortBy}
          onChange={(e) => onSortByChange(e.target.value as 'type' | 'rarity' | 'name')}
          className="px-3 py-2 text-sm border border-input rounded-md bg-background"
        >
          {SORT_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {s === 'type' ? 'Type' : s === 'rarity' ? 'Rarity (high → low)' : 'Name (A-Z)'}
            </option>
          ))}
        </select>
      </div>
      <span className="text-sm text-muted-foreground ml-auto">
        {totalCount} card{totalCount !== 1 ? 's' : ''}
      </span>
    </div>
  );
}
