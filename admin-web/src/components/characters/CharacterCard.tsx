import { Link } from 'react-router-dom';
import { Card, CardContent } from '../ui/card';
import { ElementIcon } from '../ElementIcon';

const CARD_IMAGE_RATIO = { width: 420, height: 720 };

export interface CharacterCardData {
  _id: string;
  name: string;
  nameId: string;
  element?: string;
}

export function CharacterCard({ character }: { character: CharacterCardData }) {
  return (
    <Link to={`/characters/${character.nameId}`} className="w-[200px] shrink-0">
      <Card className="border-0 shadow-md hover:shadow-lg transition-all duration-300 overflow-hidden group cursor-pointer">
        <div className="bg-gradient-to-br from-gray-200 to-slate-200 p-px">
          <CardContent className="p-0">
            <div
              className="relative overflow-hidden"
              style={{ aspectRatio: `${CARD_IMAGE_RATIO.width}/${CARD_IMAGE_RATIO.height}` }}
            >
              <img
                src={`/assets/images/cards/character/${character.nameId}.webp`}
                alt={character.name}
                className="w-full h-full scale-[1.03] object-cover group-hover:scale-110 transition-transform duration-300"
              />
              <div className="absolute top-1 left-1">
                <ElementIcon element={character.element ?? 'none'} size="sm" />
              </div>
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2">
                <span className="font-bold text-white text-sm">{character.name}</span>
              </div>
            </div>
          </CardContent>
        </div>
      </Card>
    </Link>
  );
}
