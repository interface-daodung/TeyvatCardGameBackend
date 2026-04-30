import { useEffect, useRef } from 'react';
import { cn } from '../lib/utils';
import { AnimatePresence, LayoutGroup, motion } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus } from '@fortawesome/free-solid-svg-icons';
import { PageHeader } from '../components/PageHeader';
import { LangDropdown } from '../components/LangDropdown';
import { Button } from '../components/ui/button';
import { EquipmentLoading } from '../components/equipment/EquipmentLoading';
import { EquipmentItemCard } from '../components/equipment/EquipmentItemCard';
import { EquipmentEditDrawer } from '../components/equipment/EquipmentEditDrawer';
import { EquipmentCreateModal } from '../components/equipment/EquipmentCreateModal';
import { useEquipment } from '../components/equipment/useEquipment';
import {
  fadeSlideCard,
  equipmentDrawerShellYTransition,
  equipmentLayoutDuration,
  equipmentLayoutEase,
} from '../components/animations/motionPresets';

export { type GameItem, type LevelStat } from '../components/equipment/equipmentUtils';

export default function Equipment() {
  const eq = useEquipment();
  const stripScrollRef = useRef<HTMLDivElement>(null);
  /** Tránh mở modal khi vừa drag-scroll strip */
  const suppressItemClickRef = useRef(false);

  useEffect(() => {
    const el = document.getElementById('admin-main-scroll');
    if (!el) return;
    if (!eq.editModalOpen) return;
    const prev = el.style.overflow;
    el.style.overflow = 'hidden';
    return () => {
      el.style.overflow = prev;
    };
  }, [eq.editModalOpen]);

  /**
   * Kéo ngang: KHÔNG dùng setPointerCapture — nếu capture lên strip thì pointerup không về đúng card → mất click.
   * Dùng listener trên document: vẫn scroll từ pixel đầu; chỉ suppress khi lệch đủ lớn (tránh rung tay khi tap).
   */
  const stripPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!eq.editModalOpen || e.button !== 0) return;
    const el = stripScrollRef.current;
    if (!el) return;

    const startX = e.clientX;
    const startScroll = el.scrollLeft;
    let dragged = false;
    const dragThresholdPx = 8;

    const onMove = (ev: PointerEvent) => {
      if (ev.pointerId !== e.pointerId) return;
      const dx = ev.clientX - startX;
      el.scrollLeft = startScroll - dx;
      if (Math.abs(dx) > dragThresholdPx) dragged = true;
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

  const equipmentItemNodes = eq.items.map((item, index) => {
    const stagger = Math.min(index, 16);
    const reverseStagger = Math.min(eq.items.length - 1 - index, 16);
    const scaleDelay =
      (eq.editModalOpen ? stagger : reverseStagger) * 0.014;
    return (
      <motion.div
        key={item.nameId}
        layout
        initial={false}
        animate={{
          scale: eq.editModalOpen ? 0.5 : 1,
        }}
        transition={{
          layout: {
            duration: equipmentLayoutDuration,
            ease: equipmentLayoutEase,
          },
          scale: {
            type: 'spring',
            stiffness: 380,
            damping: 28,
            mass: 0.85,
            delay: scaleDelay,
          },
        }}
        style={{ transformOrigin: 'top left' }}
        className={
          eq.editModalOpen
            ? 'relative h-[100px] w-[78px] shrink-0 overflow-visible rounded-lg'
            : 'min-w-0'
        }
      >
        <div
          className={
            eq.editModalOpen
              ? 'absolute left-0 top-0 w-[156px] origin-top-left pointer-events-auto'
              : ''
          }
        >
          <EquipmentItemCard
            item={item}
            editLang={eq.editLang}
            getItemDisplayName={eq.getItemDisplayName}
            getItemDisplayDescription={eq.getItemDisplayDescription}
            onClick={() => {
              if (suppressItemClickRef.current) {
                suppressItemClickRef.current = false;
                return;
              }
              eq.requestOpenEditModal(item);
            }}
            imageOnly={eq.editModalOpen}
          />
        </div>
      </motion.div>
    );
  });

  return (
    <div
      className={`flex flex-col ${
        eq.editModalOpen
          ? 'min-h-[calc(100dvh-9rem)] space-y-0 px-4 pb-4 pt-0 -mt-4 md:-mt-8'
          : 'space-y-4 min-h-[calc(100vh-3rem)] p-4 md:p-8'
      }`}
    >
      {!eq.editModalOpen && (
        <div className="shrink-0 max-w-[min(100%,calc(100%-13rem))]">
          <PageHeader
            title="Equipment"
            description="View and manage in-game items (loaded from DB)"
          />
        </div>
      )}

      {eq.error && !eq.editModalOpen && (
        <motion.div
          className="rounded-lg bg-destructive/10 text-destructive px-4 py-2 text-sm shrink-0"
          variants={fadeSlideCard}
          initial="hidden"
          animate="visible"
        >
          {eq.error}
        </motion.div>
      )}

      {eq.loading ? (
        <EquipmentLoading />
      ) : (
        <div className="flex flex-1 min-h-0 flex-col gap-0 overflow-visible">
          <div
            className={
              eq.editModalOpen
                ? 'min-w-0 shrink-0 w-full overflow-visible'
                : 'w-full'
            }
            onClick={
              eq.editModalOpen
                ? (e) => {
                    if (e.target === e.currentTarget) eq.requestCloseEditModal();
                  }
                : undefined
            }
          >
            {/* Một cây DOM cố định: tránh unmount LayoutGroup khi đổi chế độ → layout animation hoạt động */}
            <motion.div
              variants={fadeSlideCard}
              initial="hidden"
              animate="visible"
              className="w-full"
            >
              <LayoutGroup id="equipment-items">
                <div className="w-full min-w-0">
                  <div
                    ref={stripScrollRef}
                    className={
                      eq.editModalOpen
                        ? cn(
                            'flex flex-nowrap gap-2 overflow-x-auto overflow-y-hidden px-0.5 pt-2 pb-3 items-start',
                            'cursor-grab active:cursor-grabbing select-none touch-none',
                            '[scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:h-0 [&::-webkit-scrollbar]:w-0'
                          )
                        : 'grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2'
                    }
                    onPointerDown={eq.editModalOpen ? stripPointerDown : undefined}
                    onDragStart={eq.editModalOpen ? stripDragStartBlock : undefined}
                  >
                    {equipmentItemNodes}
                  </div>
                </div>
              </LayoutGroup>
            </motion.div>
          </div>

          <AnimatePresence>
            {eq.editModalOpen && eq.selectedItem ? (
            <motion.div
              className="flex min-h-0 min-w-0 flex-1 flex-col"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={equipmentDrawerShellYTransition}
            >
            <EquipmentEditDrawer
              selectedItem={eq.selectedItem}
              formValues={eq.formValues}
              setFormValues={eq.setFormValues}
              editLang={eq.editLang}
              editingField={eq.editingField}
              setEditingField={eq.setEditingField}
              i18nPopupField={eq.i18nPopupField}
              expandedLevels={eq.expandedLevels}
              formLevelMax={eq.formLevelMax}
              formLevelStats={eq.formLevelStats}
              saveLoading={eq.saveLoading}
              getDisplayName={eq.getDisplayName}
              getDisplayDescription={eq.getDisplayDescription}
              getFormI18n={eq.getFormI18n}
              setFormI18n={eq.setFormI18n}
              translateLoading={eq.translateLoading}
              i18nError={eq.i18nError}
              levelStatsValidationError={eq.levelStatsValidationError}
              error={eq.error}
              onRequestClose={eq.requestCloseEditModal}
              showUnsavedConfirm={eq.showUnsavedConfirm}
              onUnsavedStay={eq.dismissUnsavedConfirm}
              onUnsavedDiscard={eq.confirmDiscardEditModal}
              onUnsavedSave={eq.confirmSaveEditModal}
              onSave={eq.handleSave}
              onOpenI18nPopup={eq.openI18nPopup}
              onRequestCloseI18nPopup={eq.requestCloseI18nPopup}
              showLevelUnsavedConfirm={eq.showLevelUnsavedConfirm}
              onLevelUnsavedStay={eq.dismissLevelUnsavedConfirm}
              onLevelUnsavedDiscard={eq.confirmDiscardLevelPopup}
              onLevelUnsavedSave={eq.confirmSaveLevelPopup}
              showI18nUnsavedConfirm={eq.showI18nUnsavedConfirm}
              onI18nUnsavedStay={eq.dismissI18nUnsavedConfirm}
              onI18nUnsavedDiscard={eq.confirmDiscardI18nPopup}
              onI18nUnsavedSave={eq.confirmSaveI18nPopup}
              onLevelMaxChange={eq.handleLevelMaxChange}
              onToggleLevelExpanded={eq.toggleLevelExpanded}
              onUpdateLevelStat={eq.updateLevelStat}
              onLevelSave={eq.handleLevelSave}
              onI18nTranslate={eq.handleI18nTranslate}
              onI18nSave={eq.handleI18nSave}
              imageTreeOpen={eq.imageTreeOpen}
              imageTree={eq.imageTree}
              imageTreeLoading={eq.imageTreeLoading}
              imageTreeExpanded={eq.imageTreeExpanded}
              onToggleImageTree={eq.openItemImageTree}
              onToggleImageTreeExpanded={eq.toggleImageTreeExpanded}
              onSelectItemImage={eq.selectItemImage}
              onCloseImageTree={eq.closeItemImageTree}
              showDeleteConfirm={eq.showDeleteConfirm}
              deleteLoading={eq.deleteLoading}
              onRequestDelete={eq.requestDeleteItem}
              onCancelDelete={eq.cancelDeleteItem}
              onConfirmDelete={eq.confirmDeleteItem}
            />
            </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      )}

      {/* Đặt cuối DOM; khi mở drawer: hạ xuống (animate y) để bớt che strip item */}
      <motion.div
        className="fixed z-50 flex items-start justify-end pointer-events-none right-8 md:right-12 top-[calc(4rem+2rem)] md:top-[calc(4rem+3rem)]"
        animate={{ y: eq.editModalOpen ? 82 : 0 }}
        transition={{
          duration: equipmentLayoutDuration,
          ease: equipmentLayoutEase,
        }}
      >
        <div className="pointer-events-auto flex flex-wrap items-center gap-2" aria-label="Equipment quick actions">
          <Button type="button" variant="default" onClick={eq.openCreateModal}>
            <FontAwesomeIcon icon={faPlus} className="w-3.5 h-3.5 mr-1.5" />
            Add item
          </Button>
          <LangDropdown
            value={eq.editLang}
            onChange={eq.setEditLang}
            open={eq.langDropdownOpen}
            onOpenChange={eq.setLangDropdownOpen}
          />
        </div>
      </motion.div>

      <EquipmentCreateModal
        open={eq.createModalOpen}
        onClose={eq.closeCreateModal}
        loading={eq.createLoading}
        error={eq.createError}
        onSubmit={eq.handleCreateItem}
      />
    </div>
  );
}
