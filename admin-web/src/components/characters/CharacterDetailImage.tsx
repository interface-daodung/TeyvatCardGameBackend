import { Card, CardContent } from '../ui/card';
import { ElementIcon } from '../ElementIcon';
import { CARD_IMAGE_RATIO } from './characterDetailUtils';
import type { Character } from '../../services/gameDataService';

interface CharacterDetailImageProps {
  character: Character;
  effectiveElement: string;
}

export function CharacterDetailImage({ character, effectiveElement }: CharacterDetailImageProps) {
  return (
    <div className="flex flex-col">
      <h2 className="text-sm font-semibold text-muted-foreground mb-2 uppercase tracking-wider">
        Ảnh
      </h2>
      <Card className="border-0 shadow-none overflow-hidden max-w-[280px]">
        <CardContent className="p-0">
          <div
            className="relative"
            style={{ aspectRatio: `${CARD_IMAGE_RATIO.width}/${CARD_IMAGE_RATIO.height}` }}
          >
            <img
              src={`/assets/images/cards/character/${character.nameId}.webp`}
              alt={character.name}
              className="w-full h-full object-cover"
            />
            <div className="absolute top-1.5 left-1.5">
              <ElementIcon
                element={effectiveElement}
                size="md"
                className="border-2 border-white/70"
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
