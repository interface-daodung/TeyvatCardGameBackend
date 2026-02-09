import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '../components/ui/card';
import { gameDataService, type Character } from '../services/gameDataService';

const CARD_IMAGE_RATIO = { width: 420, height: 720 };

export default function Characters() {
  const [characters, setCharacters] = useState<Character[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    gameDataService
      .getCharacters()
      .then(setCharacters)
      .catch((err) => setError(err?.message ?? 'Failed to load characters'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">Loading characters...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <p className="text-destructive">{error}</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-600 to-slate-600 bg-clip-text text-transparent mb-2">
          Characters
        </h1>
        <p className="text-muted-foreground">Manage game characters and their stats</p>
      </div>

      <div className="flex flex-wrap gap-4">
        {characters.map((character) => (
          <Link
            key={character._id}
            to={`/characters/${character.nameId}`}
            className="w-[200px] shrink-0"
          >
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
                      {character.element === 'none' ? (
                        <span className="w-5 h-5 rounded-full border border-white/60 bg-black/40 flex items-center justify-center p-0.5">
                          <svg className="w-3 h-3 text-white/80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="6" y1="6" x2="18" y2="18" />
                            <line x1="18" y1="6" x2="6" y2="18" />
                          </svg>
                        </span>
                      ) : (
                        <img
                          src={`/assets/images/element/${character.element}.webp`}
                          alt={character.element}
                          className="w-5 h-5 rounded-full border border-white/60 bg-black/40 p-0.5"
                        />
                      )}
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2">
                      <span className="font-bold text-white text-sm">{character.name}</span>
                    </div>
                  </div>
                </CardContent>
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
