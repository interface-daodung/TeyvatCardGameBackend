import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { getTypeIcon, getAdventureCardImageUrl } from './adventureCardUtils';
import type { AdventureCard } from '../../services/gameDataService';

interface AdventureCardTileProps {
  card: AdventureCard;
  onClick: () => void;
  /** Hiển thị theo locale đã chọn (nếu có) */
  displayName?: string;
  displayDescription?: string;
}

export function AdventureCardTile({ card, onClick, displayName, displayDescription }: AdventureCardTileProps) {
  const imageUrl = getAdventureCardImageUrl(card);
  const typeIcon = getTypeIcon(card.type);
  const name = displayName ?? card.name;
  const description = displayDescription ?? card.description ?? '';

  return (
    <Card
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
      className="group border-0 shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden cursor-pointer rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800"
    >
      <CardContent className="relative p-0">
        <div className="relative w-full aspect-[420/720] overflow-hidden">
          <img
            src={imageUrl}
            alt={name}
            className="absolute inset-0 w-full h-full object-cover transform transition-transform duration-500 group-hover:scale-105"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).src = '/assets/images/cards/empty.webp';
            }}
          />
          {card.className && (
            <Badge
              variant="outline"
              className="absolute top-3 left-3 text-[10px] font-mono bg-black/40 text-slate-100 border-white/20 backdrop-blur-sm"
            >
              {card.className}
            </Badge>
          )}

          <div className="absolute top-3 right-3 flex flex-col items-end gap-1">
            {card.rarity != null && (
              <div className="inline-flex items-center gap-1 rounded-full bg-amber-500/90 px-3 py-1 text-[11px] font-semibold text-white shadow-md">
                <span>⭐</span>
                <span>{card.rarity}</span>
              </div>
            )}
            <Badge
              variant={
                card.status === 'enabled' ? 'default' : card.status === 'disabled' ? 'destructive' : 'secondary'
              }
              className={
                card.status === 'enabled'
                  ? 'bg-emerald-500/90 text-white border-emerald-300/60'
                  : card.status === 'hidden'
                  ? 'bg-slate-700/90 text-slate-50 border-slate-500/60'
                  : 'bg-red-500/90 text-white border-red-300/60'
              }
            >
              {card.status}
            </Badge>
          </div>

          <div className="absolute inset-x-0 bottom-0 p-4 pt-6">
            <div className="rounded-2xl bg-black/60 backdrop-blur-md border border-white/10 px-4 py-3 space-y-2 shadow-[0_10px_40px_rgba(0,0,0,0.7)]">
              <CardHeader className="p-0">
                <CardTitle className="text-lg font-semibold text-white flex items-center gap-2">
                  <span className="text-2xl drop-shadow">{typeIcon}</span>
                  <span className="truncate">{name}</span>
                </CardTitle>
                {description && (
                  <CardDescription className="mt-1 text-xs text-slate-200/80 line-clamp-2">
                    {description}
                  </CardDescription>
                )}
              </CardHeader>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-slate-100">
                <span className="px-2 py-0.5 rounded-full bg-white/10 border border-white/20 font-mono uppercase tracking-wide">
                  ID: {card.nameId}
                </span>
                <Badge className="bg-indigo-500/80 text-white border-indigo-300/60">{card.type}</Badge>
                {card.category && (
                  <span className="px-2 py-0.5 rounded-full bg-white/10 border border-white/10">
                    {card.category}
                  </span>
                )}
                {card.element && (
                  <Badge className="bg-sky-500/80 text-white border-sky-300/60">{card.element}</Badge>
                )}
                {card.clan && (
                  <span className="px-2 py-0.5 rounded-full bg-white/10 border border-white/10">
                    {card.clan}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
