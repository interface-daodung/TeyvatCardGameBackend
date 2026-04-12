import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { getTypeIcon, getAdventureCardImageUrl, normalizeAdventureCardStatus } from './adventureCardUtils';
import type { AdventureCard } from '../../services/gameDataService';
import { cn } from '../../lib/utils';

interface AdventureCardTileProps {
  card: AdventureCard;
  onClick: () => void;
  /** Hiển thị theo locale đã chọn (nếu có) */
  displayName?: string;
  displayDescription?: string;
  /**
   * Lưới khi mở drawer: thu nhỏ thẻ, chỉ tên + nameId trên ảnh (không panel nền / badge góc).
   */
  compact?: boolean;
}

export function AdventureCardTile({
  card,
  onClick,
  displayName,
  displayDescription,
  compact = false,
}: AdventureCardTileProps) {
  const imageUrl = getAdventureCardImageUrl(card);
  const status = normalizeAdventureCardStatus(card.status);
  const typeIcon = getTypeIcon(card.type);
  const name = displayName ?? card.name;
  const description = displayDescription ?? card.description ?? '';

  const cardInner = (
    <Card
      role="presentation"
      className={cn(
        'group border-0 overflow-hidden transition-all duration-300',
        compact
          ? 'shadow-md hover:shadow-lg rounded-xl bg-gradient-to-br from-slate-900 to-slate-800'
          : 'cursor-pointer shadow-lg hover:shadow-2xl rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800'
      )}
    >
      <CardContent className="relative p-0">
        <div className="relative w-full aspect-[420/720] overflow-hidden">
          <img
            src={imageUrl}
            alt={name}
            className={cn(
              'absolute inset-0 w-full h-full object-cover',
              !compact && 'transform transition-transform duration-500 group-hover:scale-105'
            )}
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).src = '/assets/images/cards/empty.webp';
            }}
            draggable={false}
          />
          {card.className && !compact && (
            <Badge
              variant="outline"
              className="absolute left-3 top-3 font-mono bg-black/40 text-slate-100 border-white/20 backdrop-blur-sm text-[10px]"
            >
              {card.className}
            </Badge>
          )}

          {!compact && (
            <div className="absolute right-3 top-3 flex flex-col items-end gap-1">
              {card.rarity != null && (
                <div className="inline-flex items-center gap-0.5 rounded-full bg-amber-500/90 px-3 py-1 text-[11px] font-semibold text-white shadow-md">
                  <span>⭐</span>
                  <span>{card.rarity}</span>
                </div>
              )}
              <Badge
                variant={status === 'enabled' ? 'default' : 'destructive'}
                className={
                  status === 'enabled'
                    ? 'bg-emerald-500/90 text-white border-emerald-300/60'
                    : 'bg-red-500/90 text-white border-red-300/60'
                }
              >
                {status}
              </Badge>
            </div>
          )}

          {compact ? (
            <div className="pointer-events-none absolute inset-x-0 bottom-0 p-2 pt-10">
              <CardHeader className="space-y-0.5 p-0">
                <CardTitle className="text-[11px] font-semibold leading-tight text-white line-clamp-2 [paint-order:stroke_fill] [-webkit-text-stroke:1.75px_rgba(0,0,0,0.9)]">
                  {name}
                </CardTitle>
                <p className="font-mono text-[9px] lowercase text-white [paint-order:stroke_fill] [-webkit-text-stroke:1.75px_rgba(0,0,0,0.9)]">
                  {card.nameId}
                </p>
              </CardHeader>
            </div>
          ) : (
            <div className="absolute inset-x-0 bottom-0 p-4 pt-6">
              <div className="space-y-2 rounded-2xl border border-white/10 bg-black/60 px-4 py-3 shadow-[0_10px_40px_rgba(0,0,0,0.7)] backdrop-blur-md">
                <CardHeader className="p-0">
                  <CardTitle className="flex items-center gap-2 text-lg font-semibold text-white">
                    <span className="text-2xl drop-shadow">{typeIcon}</span>
                    <span className="truncate">{name}</span>
                  </CardTitle>
                  {description && (
                    <CardDescription className="mt-1 line-clamp-2 text-xs text-slate-200/80">
                      {description}
                    </CardDescription>
                  )}
                </CardHeader>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-slate-100">
                  <span className="rounded-full border border-white/20 bg-white/10 px-2 py-0.5 font-mono uppercase tracking-wide">
                    ID: {card.nameId}
                  </span>
                  <Badge className="border-indigo-300/60 bg-indigo-500/80 text-white">{card.type}</Badge>
                  {card.category && (
                    <span className="rounded-full border border-white/10 bg-white/10 px-2 py-0.5">
                      {card.category}
                    </span>
                  )}
                  {card.element && (
                    <Badge className="border-sky-300/60 bg-sky-500/80 text-white">{card.element}</Badge>
                  )}
                  {card.clan && (
                    <span className="rounded-full border border-white/10 bg-white/10 px-2 py-0.5">
                      {card.clan}
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div
      role="button"
      tabIndex={0}
      className={cn(
        'block w-full min-w-0 outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2',
        compact ? 'rounded-xl touch-pan-y' : 'rounded-2xl'
      )}
      onClick={(e) => {
        e.preventDefault();
        onClick();
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
    >
      {cardInner}
    </div>
  );
}
