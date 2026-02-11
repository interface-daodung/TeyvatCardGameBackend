import { useEffect, useState, useMemo } from 'react';
import { gameDataService, AdventureCard } from '../services/gameDataService';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Skeleton } from '../components/ui/skeleton';

const CARD_TYPES = ['all', 'weapon', 'enemy', 'food', 'trap', 'treasure', 'bomb', 'coin', 'empty'] as const;
const SORT_OPTIONS = ['type', 'rarity', 'name'] as const;
const TYPE_ORDER: Record<string, number> = {
  weapon: 1,
  enemy: 2,
  food: 3,
  trap: 4,
  treasure: 5,
  bomb: 6,
  coin: 7,
  empty: 8,
};

export default function AdventureCards() {
  const [cards, setCards] = useState<AdventureCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'type' | 'rarity' | 'name'>('type');

  useEffect(() => {
    const fetchCards = async () => {
      try {
        setLoading(true);
        const type = typeFilter === 'all' ? undefined : typeFilter;
        const data = await gameDataService.getAdventureCards(undefined, type);
        setCards(data);
      } catch (error) {
        console.error('Failed to fetch adventure cards:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchCards();
  }, [typeFilter]);

  const sortedCards = useMemo(() => {
    const arr = [...cards];
    if (sortBy === 'type') {
      arr.sort((a, b) => (TYPE_ORDER[a.type] ?? 99) - (TYPE_ORDER[b.type] ?? 99) || a.name.localeCompare(b.name));
    } else if (sortBy === 'rarity') {
      arr.sort((a, b) => (b.rarity ?? 0) - (a.rarity ?? 0) || a.name.localeCompare(b.name));
    } else {
      arr.sort((a, b) => a.name.localeCompare(b.name));
    }
    return arr;
  }, [cards, sortBy]);

  const getTypeIcon = (type: string) => {
    const icons: Record<string, string> = {
      weapon: '⚔️',
      enemy: '👹',
      food: '🍎',
      trap: '🕳️',
      treasure: '📦',
      bomb: '💣',
      coin: '🪙',
      empty: '⬜',
    };
    return icons[type] || '🎴';
  };

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-32" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-4 w-full mb-4" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-4xl font-bold bg-gradient-to-r from-primary-600 to-red-600 bg-clip-text text-transparent mb-2">
          Adventure Cards
        </h1>
        <p className="text-muted-foreground">Manage adventure cards for maps</p>
      </div>

      <div className="flex flex-wrap gap-4 items-center">
        <div className="flex items-center gap-2">
          <label htmlFor="type-filter" className="text-sm font-medium text-muted-foreground">
            Type:
          </label>
          <select
            id="type-filter"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
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
            onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
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
          {sortedCards.length} card{sortedCards.length !== 1 ? 's' : ''}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {sortedCards.map((card) => (
          <Card key={card._id} className="border-0 shadow-lg hover:shadow-xl transition-shadow duration-300 overflow-hidden">
            <div className="bg-gradient-to-br from-primary-100 to-red-100 p-1">
              <CardContent className="bg-card p-6 relative">
                {card.className && (
                  <Badge
                    variant="outline"
                    className="absolute top-2 right-2 text-xs font-mono bg-background/80 border-primary-200"
                  >
                    {card.className}
                  </Badge>
                )}
                <CardHeader className="p-0 mb-4 pr-24">
                  <CardTitle className="text-xl text-primary-700 flex items-center">
                    <span className="mr-2 text-2xl">{getTypeIcon(card.type)}</span>
                    {card.name}
                  </CardTitle>
                  <CardDescription className="mt-2">{card.description}</CardDescription>
                </CardHeader>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-2 bg-primary-50 rounded-md">
                    <span className="text-sm font-medium text-muted-foreground">ID</span>
                    <span className="text-xs font-mono text-primary-600">{card.nameId}</span>
                  </div>
                  <div className="flex items-center justify-between p-2 bg-primary-50 rounded-md">
                    <span className="text-sm font-medium text-muted-foreground">Type</span>
                    <Badge variant="outline" className="border-primary-200 text-primary-700">
                      {card.type}
                    </Badge>
                  </div>
                  {card.category && (
                    <div className="flex items-center justify-between p-2 bg-primary-50 rounded-md">
                      <span className="text-sm font-medium text-muted-foreground">Category</span>
                      <span className="text-sm font-medium">{card.category}</span>
                    </div>
                  )}
                  {card.element && (
                    <div className="flex items-center justify-between p-2 bg-primary-50 rounded-md">
                      <span className="text-sm font-medium text-muted-foreground">Element</span>
                      <Badge variant="outline" className="text-primary-600">{card.element}</Badge>
                    </div>
                  )}
                  {card.clan && (
                    <div className="flex items-center justify-between p-2 bg-primary-50 rounded-md">
                      <span className="text-sm font-medium text-muted-foreground">Clan</span>
                      <span className="text-sm">{card.clan}</span>
                    </div>
                  )}
                  {card.rarity != null && (
                    <div className="flex items-center justify-between p-2 bg-amber-50 rounded-md">
                      <span className="text-sm font-medium text-muted-foreground">⭐ Rarity</span>
                      <span className="text-sm font-bold text-amber-600">{card.rarity}</span>
                    </div>
                  )}
                  {card.appearanceRate != null && (
                    <div className="flex items-center justify-between p-2 bg-red-50 rounded-md">
                      <span className="text-sm font-medium text-muted-foreground">📊 Appearance Rate</span>
                      <span className="text-sm font-bold text-red-600">{card.appearanceRate}%</span>
                    </div>
                  )}
                  <div className="mt-4 pt-4 border-t border-border">
                    <Badge
                      variant={card.status === 'enabled' ? 'default' : card.status === 'disabled' ? 'destructive' : 'secondary'}
                      className={card.status === 'enabled' ? 'bg-green-100 text-green-800 border-green-200' : card.status === 'hidden' ? 'bg-gray-100 text-gray-800 border-gray-200' : ''}
                    >
                      {card.status}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
