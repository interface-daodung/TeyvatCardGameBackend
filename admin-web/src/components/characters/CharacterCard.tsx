import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { ElementIcon } from '../ElementIcon';

const CARD_IMAGE_RATIO = { width: 420, height: 720 };

export interface CharacterCardData {
  _id: string;
  name: string;
  nameId: string;
  description?: string;
  element?: string;
  status?: 'enabled' | 'disabled';
}

export interface CharacterCardProps {
  character: CharacterCardData;
  /** Resolved description from i18n (character.{nameId}.description). Prefer this over character.description which may be the key. */
  descriptionDisplay?: string;
  /** Khi có: thẻ là nút (vd. mở drawer), không điều hướng sang route chi tiết. */
  onSelect?: () => void;
  /**
   * `compact`: ảnh + tên + level (không mô tả, ID, status) — dùng lưới nhỏ (vd. UserDetail).
   * `minLabel`: chỉ tên + nameId, chữ trên ảnh (không panel nền) — lưới khi mở drawer.
   * `default`: đầy đủ như trang Characters.
   */
  variant?: 'default' | 'compact' | 'minLabel';
  /** Khi `variant="compact"`: hiển thị cấp (vd. từ saveGame). */
  level?: number;
}

export function CharacterCard({
  character,
  descriptionDisplay,
  onSelect,
  variant = 'default',
  level,
}: CharacterCardProps) {
  const isMinLabel = variant === 'minLabel';
  const isCompact = variant === 'compact' || isMinLabel;
  const descriptionText = descriptionDisplay ?? (character.description?.startsWith('character.') ? '' : character.description ?? '');
  const statusPill: 'enabled' | 'disabled' | undefined =
    character.status == null ? undefined : character.status === 'enabled' ? 'enabled' : 'disabled';
  const showStatus = !isCompact && statusPill != null;
  const showTopNameBadge = !isCompact && !isMinLabel;
  const levelDisplay = typeof level === 'number' && Number.isFinite(level) ? Math.max(1, Math.floor(level)) : null;

  const card = (
      <Card
        role={onSelect ? 'presentation' : 'button'}
        tabIndex={onSelect ? undefined : 0}
        className={
          isCompact
            ? `group border-0 shadow-md hover:shadow-lg transition-all duration-300 overflow-hidden ${onSelect ? 'cursor-pointer' : 'cursor-default'} rounded-xl bg-gradient-to-br from-slate-900 to-slate-800`
            : 'group border-0 shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden cursor-pointer rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800'
        }
      >
        <CardContent className="relative p-0">
          <div
            className="relative w-full overflow-hidden"
            style={{ aspectRatio: `${CARD_IMAGE_RATIO.width}/${CARD_IMAGE_RATIO.height}` }}
          >
            <img
              src={`/assets/images/cards/character/${character.nameId}.webp`}
              alt={character.name}
              className={
                isCompact
                  ? 'absolute inset-0 w-full h-full object-cover'
                  : 'absolute inset-0 w-full h-full object-cover transform transition-transform duration-500 group-hover:scale-105'
              }
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src = '/assets/images/cards/empty.webp';
              }}
            />

            {showTopNameBadge && (
              <div className="absolute top-3 left-3 max-w-[calc(100%-6rem)]">
                <span className="inline-block truncate px-2 py-0.5 rounded-full border border-white/20 bg-black/45 font-mono text-[10px] tracking-wide text-slate-100 backdrop-blur-sm">
                  {character.name}
                </span>
              </div>
            )}

            {showStatus && (
              <div className="absolute top-3 right-3 flex flex-col items-end gap-1">
                <Badge
                  variant={statusPill === 'enabled' ? 'default' : 'destructive'}
                  className={
                    statusPill === 'enabled'
                      ? 'bg-emerald-500/90 text-white border-emerald-300/60'
                      : 'bg-red-500/90 text-white border-red-300/60'
                  }
                >
                  {statusPill}
                </Badge>
              </div>
            )}

            {isMinLabel ? (
              <div className="pointer-events-none absolute inset-x-0 bottom-0 p-2 pt-10">
                <CardHeader className="space-y-0.5 p-0">
                  <CardTitle className="text-[11px] font-semibold leading-tight text-white line-clamp-2 [paint-order:stroke_fill] [-webkit-text-stroke:1.75px_rgba(0,0,0,0.9)]">
                    {character.name}
                  </CardTitle>
                  <p className="font-mono text-[9px] lowercase text-white [paint-order:stroke_fill] [-webkit-text-stroke:1.75px_rgba(0,0,0,0.9)]">
                    {character.nameId}
                  </p>
                </CardHeader>
              </div>
            ) : isCompact ? (
              <div className="absolute inset-x-0 bottom-0 p-2 pt-8 bg-gradient-to-t from-black/85 via-black/40 to-transparent">
                <div className="flex items-end justify-between gap-2 min-h-[2.5rem]">
                  <CardHeader className="p-0 flex-1 min-w-0">
                    <CardTitle className="text-xs font-semibold text-white leading-tight line-clamp-2">
                      {character.name}
                    </CardTitle>
                  </CardHeader>
                  {levelDisplay != null && (
                    <span className="shrink-0 inline-flex items-center rounded-full bg-amber-500/95 px-1.5 py-0.5 text-[10px] font-bold text-white shadow">
                      Lv.{levelDisplay}
                    </span>
                  )}
                </div>
              </div>
            ) : (
              <div className="absolute inset-x-0 bottom-0 p-4 pt-6">
                <div className="rounded-2xl bg-black/60 backdrop-blur-md border border-white/10 px-4 py-3 space-y-2 shadow-[0_10px_40px_rgba(0,0,0,0.7)]">
                  <CardHeader className="p-0">
                    <CardTitle className="text-lg font-semibold text-white flex items-center gap-2">
                      <span className="shrink-0 drop-shadow">
                        <ElementIcon element={character.element ?? 'none'} size="sm" />
                      </span>
                      <span className="truncate">{character.name}</span>
                    </CardTitle>
                    {descriptionText !== '' && (
                      <CardDescription className="mt-1 text-xs text-slate-200/80 line-clamp-2">
                        {descriptionText}
                      </CardDescription>
                    )}
                  </CardHeader>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-slate-100">
                    <span className="px-2 py-0.5 rounded-full bg-white/10 border border-white/20 font-mono tracking-wide">
                      ID: {character.nameId}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
  );

  if (onSelect) {
    return (
      <div
        role="button"
        tabIndex={0}
        className={`block w-full min-w-0 outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 ${isCompact ? 'rounded-xl' : 'rounded-2xl'}`}
        onClick={(e) => {
          e.preventDefault();
          onSelect();
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onSelect();
          }
        }}
      >
        {card}
      </div>
    );
  }

  return <div className="block w-full min-w-0">{card}</div>;
}
