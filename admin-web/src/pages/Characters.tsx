import { useState, useEffect } from 'react';
import { gameDataService, type Character } from '../services/gameDataService';
import { localizationService } from '../services/localizationService';
import { PageHeader } from '../components/PageHeader';
import { LangDropdown } from '../components/LangDropdown';
import type { EditLang } from '../components/LangDropdown';
import { CharacterCard } from '../components/characters/CharacterCard';

export default function Characters() {
  const [characters, setCharacters] = useState<Character[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editLang, setEditLang] = useState<EditLang>('en');
  const [langDropdownOpen, setLangDropdownOpen] = useState(false);
  const [descriptionByNameId, setDescriptionByNameId] = useState<Record<string, string>>({});

  useEffect(() => {
    gameDataService
      .getCharacters()
      .then(setCharacters)
      .catch((err) => setError(err?.message ?? 'Failed to load characters'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (characters.length === 0) {
      setDescriptionByNameId({});
      return;
    }
    const keyFor = (c: Character) => c.description?.startsWith('character.') ? c.description : `character.${c.nameId}.description`;
    Promise.all(
      characters.map((c) =>
        localizationService
          .getLocalizationByKey(keyFor(c))
          .then((loc) => ({ nameId: c.nameId, t: loc.translations ?? {} }))
          .catch(() => ({ nameId: c.nameId, t: {} as Record<string, string> }))
      )
    ).then((results) => {
      const next: Record<string, string> = {};
      results.forEach(({ nameId, t }) => {
        next[nameId] = t[editLang] ?? t.en ?? '';
      });
      setDescriptionByNameId(next);
    });
  }, [characters, editLang]);

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
      <div className="flex flex-wrap items-center justify-between gap-4">
        <PageHeader title="Characters" description="Manage game characters and their stats" />
        <LangDropdown
          value={editLang}
          onChange={setEditLang}
          open={langDropdownOpen}
          onOpenChange={setLangDropdownOpen}
        />
      </div>

      <div className="flex flex-wrap gap-4">
        {characters.map((character) => (
          <CharacterCard
            key={character._id}
            character={character}
            descriptionDisplay={descriptionByNameId[character.nameId]}
          />
        ))}
      </div>
    </div>
  );
}
