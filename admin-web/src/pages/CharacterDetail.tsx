import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { PageHeader } from '../components/PageHeader';
import { LangDropdown } from '../components/LangDropdown';
import { I18nDescriptionModal } from '../components/i18n/I18nDescriptionModal';
import { CharacterDetailLoading } from '../components/characters/CharacterDetailLoading';
import { CharacterDetailError } from '../components/characters/CharacterDetailError';
import { CharacterDetailImage } from '../components/characters/CharacterDetailImage';
import { CharacterDetailInfo } from '../components/characters/CharacterDetailInfo';
import { CharacterDetailEditPanel } from '../components/characters/CharacterDetailEditPanel';
import { useCharacterDetail } from '../components/characters/useCharacterDetail';

export default function CharacterDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const detail = useCharacterDetail(id);

  if (detail.loading) {
    return <CharacterDetailLoading />;
  }

  if (detail.error || !detail.character) {
    return (
      <CharacterDetailError
        message={detail.error ?? 'Character not found'}
        onBack={() => navigate('/characters')}
      />
    );
  }

  const effectiveElement = detail.displayElement || detail.character.element || 'cryo';

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <PageHeader
          title="Character Details"
          description="View and manage character info"
        />
        <LangDropdown
          value={detail.editLang}
          onChange={detail.setEditLang}
          open={detail.langDropdownOpen}
          onOpenChange={detail.setLangDropdownOpen}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <CharacterDetailImage
          character={detail.character}
          effectiveElement={effectiveElement}
        />
        <CharacterDetailInfo
          effectiveElement={effectiveElement}
          displayName={detail.getDisplayName()}
          displayHp={detail.displayHp}
          displayLevel={detail.displayLevel}
          displayDescription={detail.getDisplayDescription()}
          editingField={detail.editingField}
          onOpenI18n={detail.openI18nPopup}
          onStartEdit={detail.startEdit}
        />
        <CharacterDetailEditPanel
          editingField={detail.editingField}
          editedHp={detail.editedHp}
          onEditedHpChange={detail.setEditedHp}
          effectiveElement={effectiveElement}
          displayLevel={detail.displayLevel}
          onDisplayLevelChange={detail.setDisplayLevel}
          levelPrices={detail.levelPrices}
          editingPriceForLevel={detail.editingPriceForLevel}
          editedPriceValue={detail.editedPriceValue}
          onEditedPriceValueChange={detail.setEditedPriceValue}
          saveLoading={detail.saveLoading}
          onSaveEdit={detail.saveEdit}
          onCancelEdit={detail.cancelEdit}
          onSavePriceEdit={detail.savePriceEdit}
          onStartPriceEdit={detail.startPriceEdit}
          onSetDisplayElementAndPersist={detail.setDisplayElementAndPersist}
        />
      </div>

      <Button
        onClick={() => navigate('/characters')}
        className="bg-blue-600 hover:bg-blue-700 text-white"
      >
        Back
      </Button>

      <I18nDescriptionModal
        open={detail.i18nModalField !== null}
        title={detail.i18nModalField === 'name' ? 'Sửa Name (i18n)' : 'Sửa Description (i18n)'}
        editLang={detail.editLang}
        getValue={detail.getFormI18n}
        onChange={(lang, val) => detail.setFormI18n(lang, val)}
        onTranslate={detail.handleI18nTranslate}
        onSave={detail.handleI18nSave}
        onClose={detail.closeI18nPopup}
        translateLoading={detail.translateLoading}
        error={detail.i18nError}
      />
    </div>
  );
}
