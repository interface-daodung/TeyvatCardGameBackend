import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { fadeSlideCard } from '../animations/motionPresets';
import { I18nDescriptionModal } from '../i18n/I18nDescriptionModal';
import { CharacterDetailLoading } from './CharacterDetailLoading';
import { CharacterDetailError } from './CharacterDetailError';
import { CharacterDetailImage } from './CharacterDetailImage';
import { CharacterDetailInfo } from './CharacterDetailInfo';
import { CharacterLevelEditModal } from './CharacterLevelEditModal';
import { useCharacterDetail, type UseCharacterDetailLangControl } from './useCharacterDetail';
import { SourceClassEditor } from '../code/SourceClassEditor';
import { CharacterClassAstFlow } from '../code/CharacterClassAstFlow';
import { AttachedPanel } from '../share';
import {
  filesService,
  type CharacterClassAstMapResult,
  type FileTreeItem,
} from '../../services/filesService';

function toPascalCase(input: string): string {
  return input
    .replace(/[-_\s]+(.)?/g, (_, ch: string | undefined) => (ch ? ch.toUpperCase() : ''))
    .replace(/^(.)/, (s) => s.toUpperCase());
}

function findDirChild(items: FileTreeItem[] | undefined, name: string): FileTreeItem | undefined {
  if (!items?.length) return undefined;
  const lower = name.toLowerCase();
  return items.find((n) => n.type === 'dir' && n.name.toLowerCase() === lower);
}

export interface CharacterDetailViewProps {
  nameId: string | undefined;
  onNavigateBack: () => void;
  /** Dùng chung ngôn ngữ với dropdown nổi trên trang Characters */
  langControl?: UseCharacterDetailLangControl;
  /** FAB: hiện editor class .ts thay cho lưới chi tiết */
  drawerClassCodeOpen?: boolean;
  /** FAB: chỉ luồng AST / CharacterClassAstFlow */
  drawerAstFlowOpen?: boolean;
  /** FAB: quản lý ảnh đính kèm (skill) */
  drawerAttachedOpen?: boolean;
}

export function CharacterDetailView({
  nameId,
  onNavigateBack,
  langControl,
  drawerClassCodeOpen = false,
  drawerAstFlowOpen = false,
  drawerAttachedOpen = false,
}: CharacterDetailViewProps) {
  const detail = useCharacterDetail(nameId, langControl);
  const [astMapLoading, setAstMapLoading] = useState(false);
  const [astMapError, setAstMapError] = useState<string | null>(null);
  const [astMapData, setAstMapData] = useState<CharacterClassAstMapResult | null>(null);

  const character = detail.character;
  const characterNameId = character?.nameId ?? '';
  const effectiveElement = detail.displayElement || character?.element || 'cryo';
  const characterClassName = useMemo(() => toPascalCase(characterNameId), [characterNameId]);
  const characterRelativeClassPath = useMemo(
    () => `character/${characterClassName}.ts`,
    [characterClassName]
  );

  useEffect(() => {
    if (!drawerAstFlowOpen) {
      setAstMapData(null);
      setAstMapError(null);
      setAstMapLoading(false);
      return;
    }
    if (!characterClassName) {
      setAstMapData(null);
      setAstMapError(null);
      return;
    }
    let cancelled = false;
    setAstMapLoading(true);
    setAstMapError(null);
    filesService
      .getCharacterClassAstMap(characterRelativeClassPath, characterClassName)
      .then((data) => {
        if (!cancelled) setAstMapData(data);
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        const message =
          error instanceof Error ? error.message : 'Không phân tích được AST class nhân vật';
        setAstMapError(message);
        setAstMapData(null);
      })
      .finally(() => {
        if (!cancelled) setAstMapLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [drawerAstFlowOpen, characterClassName, characterRelativeClassPath]);

  const [cardReferenceImage, setCardReferenceImage] = useState<string | null>(null);
  const [imagePickerOpen, setImagePickerOpen] = useState(false);
  /** Thư mục gốc khi mở image tree */
  const [imagePickerRoot, setImagePickerRoot] = useState<
    'character' | 'character-spritesheet' | 'character-unlock'
  >('character');
  const [imageTree, setImageTree] = useState<FileTreeItem[] | null>(null);
  const [imageTreeLoading, setImageTreeLoading] = useState(false);
  const [imageTreeExpanded, setImageTreeExpanded] = useState<Set<string>>(new Set());

  useEffect(() => {
    setCardReferenceImage(null);
    setImagePickerOpen(false);
    setImagePickerRoot('character');
    setImageTree(null);
    setImageTreeExpanded(new Set());
  }, [nameId]);

  const characterImageTree = useMemo(() => {
    if (!imageTree) return null;
    if (imagePickerRoot === 'character-spritesheet') {
      const spritesheetDir = findDirChild(imageTree, 'Spritesheet');
      return spritesheetDir?.children ?? [];
    }
    if (imagePickerRoot === 'character-unlock') {
      const cardsDir = findDirChild(imageTree, 'cards');
      const unlockDir = findDirChild(cardsDir?.children, 'unlock');
      return unlockDir?.children ?? [];
    }
    const cardsDir = findDirChild(imageTree, 'cards');
    const characterDir = findDirChild(cardsDir?.children, 'character');
    if (!characterDir?.children) return [];
    return characterDir.children;
  }, [imageTree, imagePickerRoot]);

  const openCharacterImagePicker = async (
    root: 'character' | 'character-spritesheet' | 'character-unlock' = 'character'
  ) => {
    setImagePickerRoot(root);
    setImagePickerOpen(true);
    if (imageTree === null && !imageTreeLoading) {
      setImageTreeLoading(true);
      try {
        const tree = await filesService.getImageTree('manager-assets');
        setImageTree(tree);
      } catch {
        setImageTree([]);
      } finally {
        setImageTreeLoading(false);
      }
    }
  };

  const toggleImageTreeExpanded = (path: string) => {
    setImageTreeExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  };

  const selectCharacterReferenceImage = async (path: string) => {
    setImagePickerOpen(false);
    if (imagePickerRoot === 'character-spritesheet') {
      try {
        await detail.persistChanges({ imageSpritesheet: path });
      } catch {
        /* persistChanges đã set saveLoading; lỗi có thể báo sau */
      }
      return;
    }
    if (imagePickerRoot === 'character-unlock') {
      try {
        await detail.persistChanges({ imageUnlock: path });
      } catch {
        /* idem */
      }
      return;
    }
    setCardReferenceImage(path);
  };

  const closeCharacterImagePicker = () => setImagePickerOpen(false);

  if (detail.loading) return <CharacterDetailLoading />;
  if (detail.error || !detail.character) {
    return (
      <CharacterDetailError
        message={detail.error ?? 'Character not found'}
        onBack={onNavigateBack}
      />
    );
  }

  const detailGrid = (
    <motion.div
      className="grid grid-cols-1 gap-4 xl:grid-cols-12"
      variants={fadeSlideCard}
      initial="hidden"
      animate="visible"
    >
      <div className="xl:col-span-4">
        <CharacterDetailImage
          character={detail.character}
          referenceImagePath={cardReferenceImage}
          isPickerOpen={imagePickerOpen}
          imagePickerRoot={imagePickerRoot}
          characterImageTree={characterImageTree}
          imageTreeLoading={imageTreeLoading}
          imageTreeExpanded={imageTreeExpanded}
          onToggleExpanded={toggleImageTreeExpanded}
          onSelectReferenceImage={selectCharacterReferenceImage}
          onClosePicker={closeCharacterImagePicker}
          onOpenPicker={openCharacterImagePicker}
        />
      </div>
      <div className="space-y-4 xl:col-span-8">
        <CharacterDetailInfo
          effectiveElement={effectiveElement}
          displayName={detail.getDisplayName()}
          displayHp={detail.displayHp}
          displayLevel={detail.displayLevel}
          displayDescription={detail.getDisplayDescription()}
          characterStatus={character?.status === 'enabled' ? 'enabled' : 'disabled'}
          statusSaveLoading={detail.saveLoading}
          onSetCharacterStatus={(status) => void detail.persistChanges({ status })}
          editingField={detail.editingField}
          onOpenI18n={detail.openI18nPopup}
          onStartEdit={detail.startEdit}
          onSetDisplayElementAndPersist={detail.setDisplayElementAndPersist}
          onOpenLevelEdit={detail.openLevelEditModal}
          onCommitHp={detail.commitHp}
        />
        <CharacterLevelEditModal
          open={detail.levelEditModalOpen}
          onClose={detail.cancelLevelEditModal}
          onSave={() => void detail.saveLevelEditModal()}
          saveLoading={detail.saveLoading}
          displayLevel={detail.displayLevel}
          onDisplayLevelChange={detail.setDisplayLevel}
          levelPrices={detail.levelPrices}
          editingPriceForLevel={detail.editingPriceForLevel}
          editedPriceValue={detail.editedPriceValue}
          onEditedPriceValueChange={detail.setEditedPriceValue}
          onSavePriceEdit={detail.savePriceEdit}
          onStartPriceEdit={detail.startPriceEdit}
        />
      </div>
    </motion.div>
  );

  return (
    <div className="space-y-4 px-3 pb-4 pt-2 min-h-0">
      {drawerClassCodeOpen ? (
        <motion.div
          className="space-y-4 rounded-xl border border-slate-200 bg-white p-3 md:p-4"
          variants={fadeSlideCard}
          initial="hidden"
          animate="visible"
        >
          <SourceClassEditor type="character" className={characterClassName} />
        </motion.div>
      ) : drawerAstFlowOpen ? (
        <motion.div
          className="space-y-4 rounded-xl border border-slate-200 bg-white p-3 md:p-4"
          variants={fadeSlideCard}
          initial="hidden"
          animate="visible"
        >
          <CharacterClassAstFlow
            loading={astMapLoading}
            error={astMapError}
            astMapData={astMapData}
            classRelativePath={characterRelativeClassPath}
          />
        </motion.div>
      ) : drawerAttachedOpen ? (
        <AttachedPanel
          entityId={detail.character._id}
          attached={detail.character.attached}
          saveLoading={detail.saveLoading}
          onPersistAttached={(attached) => void detail.persistChanges({ attached })}
        />
      ) : (
        detailGrid
      )}

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
