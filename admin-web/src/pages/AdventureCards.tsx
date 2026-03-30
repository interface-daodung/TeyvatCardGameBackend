import { useEffect, useState, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion';
import { gameDataService, type AdventureCard } from '../services/gameDataService';
import { localizationService } from '../services/localizationService';
import { PageHeader } from '../components/PageHeader';
import { LangDropdown, type EditLang } from '../components/LangDropdown';
import { AdventureCardTile } from '../components/adventureCards/AdventureCardTile';
import { AdventureCardsFilters } from '../components/adventureCards/AdventureCardsFilters';
import {
  fadeSlideCard,
  slideUpItem,
  charactersLayoutDuration,
  charactersLayoutEase,
  charactersDrawerShellDurationClass,
  charactersDrawerShellEaseClass,
  characterDrawerLayoutEase,
} from '../components/animations/motionPresets';
import { AdventureCardsLoadingSkeleton } from '../components/adventureCards/AdventureCardsLoadingSkeleton';
import { Button } from '../components/ui/button';
import { AdventureCardDetailDrawer } from '../components/adventureCards/AdventureCardDetailDrawer';
import { AdventureCardClassNameModal } from '../components/adventureCards/AdventureCardClassNameModal';
import { AdventureCardI18nEditorModal } from '../components/adventureCards/AdventureCardI18nEditorModal';
import { AdventureCardCreateModal } from '../components/adventureCards/AdventureCardCreateModal';
import { sortAdventureCards } from '../components/adventureCards/adventureCardUtils';
import { useAdventureCardEdit } from '../components/adventureCards/useAdventureCardEdit';
import { UnsavedChangesDialog } from '../components/unsavedChanges';
import { cn } from '../lib/utils';

type CardTranslations = Record<string, Record<EditLang, string>>;

export default function AdventureCards() {
  const [cards, setCards] = useState<AdventureCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'type' | 'rarity' | 'name'>('type');
  const [cardNameTranslations, setCardNameTranslations] = useState<CardTranslations>({});
  const [cardDescriptionTranslations, setCardDescriptionTranslations] = useState<CardTranslations>({});

  const colScrollRef = useRef<HTMLDivElement>(null);
  const suppressItemClickRef = useRef(false);
  const skipFirstToolbarMotion = useRef(true);

  const edit = useAdventureCardEdit(setCards, (nameId, field, translations) => {
    if (field === 'name') {
      setCardNameTranslations((prev) => ({ ...prev, [nameId]: translations as Record<EditLang, string> }));
    } else {
      setCardDescriptionTranslations((prev) => ({ ...prev, [nameId]: translations as Record<EditLang, string> }));
    }
  });

  const detailOpen = edit.editOpen && edit.editCard !== null;

  useEffect(() => {
    skipFirstToolbarMotion.current = false;
  }, []);

  useEffect(() => {
    const fetchCards = async () => {
      try {
        setLoading(true);
        const data = await gameDataService.getAdventureCards();
        setCards(data);
      } catch (err) {
        console.error('Failed to fetch adventure cards:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchCards();
  }, []);

  useEffect(() => {
    if (cards.length === 0) {
      setCardNameTranslations({});
      setCardDescriptionTranslations({});
      return;
    }
    const loadTranslations = async () => {
      const nameMap: CardTranslations = {};
      const descMap: CardTranslations = {};
      const promises = cards.flatMap((card) => {
        const nameId = card.nameId;
        const nameKey = `adventureCard.${nameId}.name`;
        const descKey = `adventureCard.${nameId}.description`;
        return [
          localizationService
            .getLocalizationByKey(nameKey)
            .then((loc) => {
              if (loc.translations) nameMap[nameId] = loc.translations as Record<EditLang, string>;
            })
            .catch(() => {}),
          localizationService
            .getLocalizationByKey(descKey)
            .then((loc) => {
              if (loc.translations) descMap[nameId] = loc.translations as Record<EditLang, string>;
            })
            .catch(() => {}),
        ];
      });
      await Promise.all(promises);
      setCardNameTranslations((prev) => ({ ...prev, ...nameMap }));
      setCardDescriptionTranslations((prev) => ({ ...prev, ...descMap }));
    };
    loadTranslations();
  }, [cards]);

  useEffect(() => {
    const el = document.getElementById('admin-main-scroll');
    if (!el) return;
    if (!detailOpen) return;
    const prev = el.style.overflow;
    el.style.overflow = 'hidden';
    return () => {
      el.style.overflow = prev;
    };
  }, [detailOpen]);

  const sortedCards = useMemo(() => {
    const filtered = typeFilter === 'all' ? cards : cards.filter((c) => c.type === typeFilter);
    return sortAdventureCards(filtered, sortBy);
  }, [cards, sortBy, typeFilter]);

  const stripPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!detailOpen || e.button !== 0) return;
    /** Cảm ứng: để trình duyệt cuộn native (touch-pan-y trên strip), không cưỡng scrollTop bằng JS. */
    if (e.pointerType === 'touch') return;

    const el = colScrollRef.current;
    if (!el) return;

    const startY = e.clientY;
    const startScroll = el.scrollTop;
    let dragged = false;
    const dragThresholdPx = 8;

    const onMove = (ev: PointerEvent) => {
      if (ev.pointerId !== e.pointerId) return;
      const dy = ev.clientY - startY;
      el.scrollTop = startScroll - dy;
      if (Math.abs(dy) > dragThresholdPx) dragged = true;
    };

    const end = (ev: PointerEvent) => {
      if (ev.pointerId !== e.pointerId) return;
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerup', end);
      document.removeEventListener('pointercancel', end);
      if (dragged) suppressItemClickRef.current = true;
    };

    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup', end);
    document.addEventListener('pointercancel', end);
  };

  const stripDragStartBlock = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const cardLayoutTransition = {
    layout: {
      duration: 0.5,
      ease: characterDrawerLayoutEase,
    },
  } as const;

  const cardItemNodes = sortedCards.map((card, index) => (
    <motion.div
      key={card._id}
      layout
      variants={!detailOpen ? slideUpItem : undefined}
      custom={index}
      initial={detailOpen ? false : 'hidden'}
      animate="visible"
      transition={{
        ...cardLayoutTransition,
        ...(!detailOpen
          ? { duration: charactersLayoutDuration, ease: charactersLayoutEase }
          : { duration: 0.5, ease: characterDrawerLayoutEase }),
      }}
      className={cn(
        !detailOpen ? 'min-w-0' : 'mx-auto w-full max-w-[11rem] shrink-0 justify-self-center'
      )}
    >
      <AdventureCardTile
        card={card}
        compact={detailOpen}
        displayName={cardNameTranslations[card.nameId]?.[edit.editLang] ?? card.name}
        displayDescription={
          cardDescriptionTranslations[card.nameId]?.[edit.editLang] ?? card.description ?? ''
        }
        onClick={() => {
          if (suppressItemClickRef.current) {
            suppressItemClickRef.current = false;
            return;
          }
          edit.handleOpenEdit(card);
        }}
      />
    </motion.div>
  ));

  if (loading) {
    return <AdventureCardsLoadingSkeleton />;
  }

  const adventureToolbar = (
    <div className="flex flex-wrap items-center gap-2" aria-label="Thao tác nhanh Adventure Cards">
      <Button onClick={edit.handleOpenCreate} className="bg-primary-600 hover:bg-primary-700">
        Thêm mới
      </Button>
      <LangDropdown
        value={edit.editLang}
        onChange={edit.setEditLang}
        open={edit.langDropdownOpen}
        onOpenChange={edit.setLangDropdownOpen}
      />
    </div>
  );

  const unsavedPortal =
    typeof document !== 'undefined'
      ? createPortal(
          <>
            <UnsavedChangesDialog
              open={edit.showUnsavedConfirmEdit}
              onStay={edit.dismissUnsavedConfirmEdit}
              onDiscard={edit.confirmDiscardEdit}
              onSave={edit.confirmSaveEdit}
              saveLoading={edit.saveLoading}
              title="Lưu thay đổi?"
              description="Bạn đã chỉnh sửa thẻ. Bạn có muốn lưu trước khi đóng không?"
            />
            <UnsavedChangesDialog
              open={edit.showUnsavedConfirmI18n}
              onStay={edit.dismissUnsavedConfirmI18n}
              onDiscard={edit.confirmDiscardI18n}
              onSave={edit.confirmSaveI18n}
              saveLoading={edit.i18nSaveLoading}
              overlayClassName="z-[10001]"
              title="Lưu thay đổi?"
              description={
                edit.i18nField === 'name'
                  ? 'Bạn đã chỉnh sửa tên (i18n). Bạn có muốn lưu trước khi đóng không?'
                  : edit.i18nField === 'description'
                    ? 'Bạn đã chỉnh sửa mô tả (i18n). Bạn có muốn lưu trước khi đóng không?'
                    : 'Bạn đã chỉnh sửa bản dịch. Bạn có muốn lưu trước khi đóng không?'
              }
            />
          </>,
          document.body
        )
      : null;

  return (
    <div
      className={cn(
        'flex flex-col',
        detailOpen
          ? 'min-h-0 w-full max-w-none flex-1 overflow-hidden space-y-0 px-0 pb-0 pt-0'
          : 'min-h-[calc(100vh-3rem)] space-y-6 p-6'
      )}
    >
      {!detailOpen && (
        <div className="shrink-0 max-w-[min(100%,calc(100%-13rem))]">
          <PageHeader title="Adventure Cards" description="Manage adventure cards for maps" />
        </div>
      )}

      <div
        className={cn(
          'pointer-events-none fixed right-8 flex items-start justify-end md:right-12',
          'transition-[top] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none',
          detailOpen ? 'top-[calc(4rem+10px)] z-[70] md:top-[calc(4rem+14px)]' : 'top-[calc(4rem+2rem)] z-50 md:top-[calc(4rem+3rem)]'
        )}
      >
        <motion.div
          key={detailOpen ? 'toolbar-drawer' : 'toolbar-grid'}
          className="pointer-events-auto"
          initial={
            skipFirstToolbarMotion.current ? false : { opacity: 0.92, y: detailOpen ? 10 : -8 }
          }
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: characterDrawerLayoutEase }}
        >
          {adventureToolbar}
        </motion.div>
      </div>

      <div
        className={cn(
          detailOpen ? 'flex min-h-0 min-w-0 flex-1 flex-col gap-0 overflow-hidden' : 'min-w-0 w-full'
        )}
      >
        <div
          className={cn(
            'flex min-w-0 transition-[flex-direction]',
            charactersDrawerShellDurationClass,
            charactersDrawerShellEaseClass,
            detailOpen ? 'min-h-0 flex-1 flex-row items-stretch overflow-hidden' : 'w-full flex-col'
          )}
        >
          <div
            ref={colScrollRef}
            className={cn(
              'flex min-w-0 flex-col transition-[flex]',
              charactersDrawerShellDurationClass,
              charactersDrawerShellEaseClass,
              detailOpen
                ? cn(
                    'min-h-0 flex-[0_0_20%] cursor-grab touch-pan-y select-none active:cursor-grabbing',
                    'overflow-y-auto overflow-x-hidden px-2 py-2 pb-3',
                    'overscroll-y-contain',
                    '[scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:h-0 [&::-webkit-scrollbar]:w-0'
                  )
                : 'w-full'
            )}
            onPointerDown={detailOpen ? stripPointerDown : undefined}
            onDragStart={detailOpen ? stripDragStartBlock : undefined}
            onClick={
              detailOpen
                ? (e) => {
                    if (e.target === e.currentTarget) edit.requestCloseEdit();
                  }
                : undefined
            }
          >
            <motion.div
              variants={fadeSlideCard}
              initial="hidden"
              animate="visible"
              className={cn('flex w-full flex-col', detailOpen && 'min-h-0')}
            >
              {!detailOpen && (
                <div className="mb-4">
                  <AdventureCardsFilters
                    typeFilter={typeFilter}
                    onTypeFilterChange={setTypeFilter}
                    sortBy={sortBy}
                    onSortByChange={setSortBy}
                    totalCount={sortedCards.length}
                  />
                </div>
              )}
              <LayoutGroup id="adventure-cards-grid">
                <div
                  className={
                    detailOpen
                      ? 'grid min-h-0 w-full grid-cols-1 gap-2'
                      : 'grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4'
                  }
                >
                  {cardItemNodes}
                </div>
              </LayoutGroup>
            </motion.div>
          </div>

          <div className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
            <AnimatePresence mode="wait">
              {edit.editOpen && edit.editCard ? (
                <AdventureCardDetailDrawer
                  key={edit.editCard._id}
                  editCard={edit.editCard}
                  form={edit.form}
                  setForm={edit.setForm}
                  error={edit.error}
                  saveLoading={edit.saveLoading}
                  deleteLoading={edit.deleteLoading}
                  editLang={edit.editLang}
                  nameI18nEn={edit.nameI18nEn}
                  nameI18nVi={edit.nameI18nVi}
                  nameI18nJa={edit.nameI18nJa}
                  descI18nEn={edit.descI18nEn}
                  descI18nVi={edit.descI18nVi}
                  descI18nJa={edit.descI18nJa}
                  onOpenI18nName={() => edit.openI18nEditor('name')}
                  onOpenI18nDesc={() => edit.openI18nEditor('description')}
                  imageTreeOpen={edit.imageTreeOpen}
                  imageTree={edit.imageTree}
                  imageTreeLoading={edit.imageTreeLoading}
                  imageTreeExpanded={edit.imageTreeExpanded}
                  onRequestClose={edit.requestCloseEdit}
                  onSave={edit.handleSaveCard}
                  onDelete={edit.handleDeleteCard}
                  onToggleTree={edit.openImageTree}
                  onToggleTreeExpanded={edit.toggleTreeExpanded}
                  onSelectImage={edit.selectImage}
                  onCloseTree={() => edit.setImageTreeOpen(false)}
                  allCards={cards}
                  onOpenClassNamePicker={edit.openClassNamePicker}
                />
              ) : null}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {edit.createOpen && (
        <AdventureCardCreateModal
          form={edit.formCreate}
          setForm={edit.setFormCreate}
          error={edit.error}
          saveLoading={edit.saveLoading}
          imageTreeOpen={edit.imageTreeOpen}
          imageTree={edit.imageTree}
          imageTreeLoading={edit.imageTreeLoading}
          imageTreeExpanded={edit.imageTreeExpanded}
          onRequestClose={edit.requestCloseCreate}
          showUnsavedConfirm={edit.showUnsavedConfirmCreate}
          onUnsavedStay={edit.dismissUnsavedConfirmCreate}
          onUnsavedDiscard={edit.confirmDiscardCreate}
          onUnsavedSave={edit.confirmSaveCreate}
          onCreate={edit.handleCreateCard}
          onToggleTree={edit.openImageTree}
          onToggleTreeExpanded={edit.toggleTreeExpanded}
          onSelectImage={edit.selectImage}
          onCloseTree={() => edit.setImageTreeOpen(false)}
          allCards={cards}
        />
      )}

      {edit.editOpen && edit.editCard && (
        <AdventureCardClassNameModal
          open={edit.classNamePickerOpen}
          form={edit.form}
          editCard={edit.editCard}
          onClose={edit.closeClassNamePicker}
          onSelectClassName={edit.selectClassName}
        />
      )}

      {edit.editOpen && edit.editCard && (
        <AdventureCardI18nEditorModal
          open={edit.i18nField != null}
          field={edit.i18nField}
          title={
            edit.i18nField === 'name'
              ? 'Sửa Name (i18n)'
              : edit.i18nField === 'description'
                ? 'Sửa Description (i18n)'
                : ''
          }
          editLang={edit.editLang}
          getFormI18n={edit.getFormI18n}
          setFormI18n={edit.setFormI18n}
          onTranslate={async () => {
            if (edit.i18nField) await edit.handleI18nTranslate(edit.i18nField);
          }}
          onSave={async () => {
            if (edit.i18nField) await edit.handleI18nSave(edit.i18nField);
          }}
          onClose={edit.requestCloseI18nEditor}
          translateLoading={
            edit.i18nField === 'name'
              ? edit.translateNameLoading
              : edit.i18nField === 'description'
                ? edit.translateDescLoading
                : false
          }
          error={
            edit.i18nField === 'name'
              ? edit.i18nNameError
              : edit.i18nField === 'description'
                ? edit.i18nDescError
                : null
          }
        />
      )}

      {unsavedPortal}
    </div>
  );
}
