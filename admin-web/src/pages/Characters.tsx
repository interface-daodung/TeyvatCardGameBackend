import { useState, useEffect } from 'react';
import { gameDataService, type Character } from '../services/gameDataService';
import { PageHeader } from '../components/PageHeader';
import { CharacterCard } from '../components/characters/CharacterCard';

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
      <PageHeader title="Characters" description="Manage game characters and their stats" />

      <div className="flex flex-wrap gap-4">
        {characters.map((character) => (
          <CharacterCard key={character._id} character={character} />
        ))}
      </div>
    </div>
  );
}
