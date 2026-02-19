import { Link } from 'react-router-dom';
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
  status?: 'enabled' | 'disabled' | 'hidden' | 'unreleased';
}

export interface CharacterCardProps {
  character: CharacterCardData;
  /** Resolved description from i18n (character.{nameId}.description). Prefer this over character.description which may be the key. */
  descriptionDisplay?: string;
}

export function CharacterCard({ character, descriptionDisplay }: CharacterCardProps) {
  const descriptionText = descriptionDisplay ?? (character.description?.startsWith('character.') ? '' : character.description ?? '');
  return (
    <Link to={`/characters/${character.nameId}`} className="block w-[200px] shrink-0">
      <Card
        role="button"
        tabIndex={0}
        className="group border border-border shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden cursor-pointer rounded-2xl bg-white"
      >
        <CardContent className="relative p-0">
          <div
            className="relative w-full overflow-hidden"
            style={{ aspectRatio: `${CARD_IMAGE_RATIO.width}/${CARD_IMAGE_RATIO.height}` }}
          >
            <img
              src={`/assets/images/cards/character/${character.nameId}.webp`}
              alt={character.name}
              className="absolute inset-0 w-full h-full object-cover transform transition-transform duration-500 group-hover:scale-105"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src = '/assets/images/cards/empty.webp';
              }}
            />

            <div className="absolute top-3 left-3">
              <ElementIcon element={character.element ?? 'none'} size="sm" />
            </div>

            {character.status != null && (
              <div className="absolute top-3 right-3 flex flex-col items-end gap-1">
                <Badge
                  variant={
                    character.status === 'enabled'
                      ? 'default'
                      : character.status === 'disabled'
                        ? 'destructive'
                        : 'secondary'
                  }
                  className={
                    character.status === 'enabled'
                      ? 'bg-emerald-500/90 text-white border-emerald-300/60'
                      : character.status === 'hidden'
                        ? 'bg-slate-700/90 text-slate-50 border-slate-500/60'
                        : character.status === 'unreleased'
                          ? 'bg-amber-500/90 text-white border-amber-300/60'
                          : 'bg-red-500/90 text-white border-red-300/60'
                  }
                >
                  {character.status}
                </Badge>
              </div>
            )}

            <div className="absolute inset-x-0 bottom-0 p-4 pt-6">
              <div className="rounded-2xl bg-black/60 backdrop-blur-md border border-white/10 px-4 py-3 space-y-2 shadow-[0_10px_40px_rgba(0,0,0,0.7)]">
                <CardHeader className="p-0">
                  <CardTitle className="text-lg font-semibold text-white flex items-center gap-2">
                    <span className="text-2xl drop-shadow">👤</span>
                    <span className="truncate">{character.name}</span>
                  </CardTitle>
                  {descriptionText !== '' && (
                    <CardDescription className="mt-1 text-xs text-slate-200/80 line-clamp-2">
                      {descriptionText}
                    </CardDescription>
                  )}
                </CardHeader>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-slate-100">
                  <span className="px-2 py-0.5 rounded-full bg-white/10 border border-white/20 font-mono uppercase tracking-wide">
                    ID: {character.nameId}
                  </span>
                  {character.element != null && character.element !== 'none' && (
                    <Badge className="bg-sky-500/80 text-white border-sky-300/60">
                      {character.element}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
