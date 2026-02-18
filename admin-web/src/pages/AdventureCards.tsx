import { useEffect, useState, useMemo } from 'react';
import { gameDataService, type AdventureCard } from '../services/gameDataService';
import { PageHeader } from '../components/PageHeader';
import { LangDropdown } from '../components/LangDropdown';
import { AdventureCardTile } from '../components/adventureCards/AdventureCardTile';
import { AdventureCardsFilters } from '../components/adventureCards/AdventureCardsFilters';
import { AdventureCardsLoadingSkeleton } from '../components/adventureCards/AdventureCardsLoadingSkeleton';
import { AdventureCardEditModal } from '../components/adventureCards/AdventureCardEditModal';
import { sortAdventureCards } from '../components/adventureCards/adventureCardUtils';
import { useAdventureCardEdit } from '../components/adventureCards/useAdventureCardEdit';

export default function AdventureCards() {
  const [cards, setCards] = useState<AdventureCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'type' | 'rarity' | 'name'>('type');

  const edit = useAdventureCardEdit(setCards);

  useEffect(() => {
    const fetchCards = async () => {
      try {
        setLoading(true);
        const type = typeFilter === 'all' ? undefined : typeFilter;
        const data = await gameDataService.getAdventureCards(undefined, type);
        setCards(data);
      } catch (err) {
        console.error('Failed to fetch adventure cards:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchCards();
  }, [typeFilter]);

  const sortedCards = useMemo(
    () => sortAdventureCards(cards, sortBy),
    [cards, sortBy]
  );

  if (loading) {
    return <AdventureCardsLoadingSkeleton />;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <PageHeader
          title="Adventure Cards"
          description="Manage adventure cards for maps"
        />
        <LangDropdown
          value={edit.editLang}
          onChange={edit.setEditLang}
          open={edit.langDropdownOpen}
          onOpenChange={edit.setLangDropdownOpen}
        />
      </div>

      <AdventureCardsFilters
        typeFilter={typeFilter}
        onTypeFilterChange={setTypeFilter}
        sortBy={sortBy}
        onSortByChange={setSortBy}
        totalCount={sortedCards.length}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {sortedCards.map((card) => (
          <AdventureCardTile
            key={card._id}
            card={card}
            onClick={() => edit.handleOpenEdit(card)}
          />
        ))}
      </div>

      {edit.editOpen && edit.editCard && (
        <AdventureCardEditModal
          editCard={edit.editCard}
          form={edit.form}
          setForm={edit.setForm}
          error={edit.error}
          saveLoading={edit.saveLoading}
          editLang={edit.editLang}
          nameDisplay={edit.nameDisplay}
          descriptionDisplay={edit.descriptionDisplay}
          i18nField={edit.i18nField}
          getFormI18n={edit.getFormI18n}
          setFormI18n={edit.setFormI18n}
          translateLoading={edit.translateLoading}
          i18nError={edit.i18nError}
          imageTreeOpen={edit.imageTreeOpen}
          imageTree={edit.imageTree}
          imageTreeLoading={edit.imageTreeLoading}
          imageTreeExpanded={edit.imageTreeExpanded}
          onClose={edit.closeEdit}
          onSave={edit.handleSaveCard}
          onOpenI18n={edit.openI18nEditor}
          onI18nTranslate={edit.handleI18nTranslate}
          onI18nSave={edit.handleI18nSave}
          onI18nClose={() => {
            edit.setI18nField(null);
            edit.setI18nError(null);
          }}
          onToggleTree={edit.openImageTree}
          onToggleTreeExpanded={edit.toggleTreeExpanded}
          onSelectImage={edit.selectImage}
          onCloseTree={() => edit.setImageTreeOpen(false)}
        />
      )}
    </div>
  );
}
