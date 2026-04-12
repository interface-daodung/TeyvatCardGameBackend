import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, useDragControls, usePresence } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCode, faFloppyDisk, faPaperclip, faTrash } from '@fortawesome/free-solid-svg-icons';
import { AdventureCardImagePicker } from './AdventureCardImagePicker';
import { AdventureCardEditForm } from './AdventureCardEditForm';
import { CardDeckBuilder } from '../maps/CardDeckBuilder';
import { getAdventureCardImageUrl, contentsToIds } from './adventureCardUtils';
import { equipmentDockFabTransition, fadeSlideCard, slideInCharacterDrawer } from '../animations/motionPresets';
import { SourceClassEditor } from '../code/SourceClassEditor';
import { ConfirmDangerDialog } from '../ConfirmDangerDialog';
import {
  AttachedPanel,
  BottomDockFabShell,
  DockFabButtonRow,
  DockFabMotionGroup,
  DockPeekFabButton,
  dockPeekFabIconClassName,
} from '../share';
import type { AdventureCard } from '../../services/gameDataService';
import type { FileTreeItem } from '../../services/filesService';
import type { EditLang } from '../LangDropdown';

interface AdventureCardDetailDrawerProps {
  editCard: AdventureCard;
  form: Partial<AdventureCard>;
  setForm: React.Dispatch<React.SetStateAction<Partial<AdventureCard>>>;
  error: string | null;
  saveLoading: boolean;
  deleteLoading: boolean;
  editLang: EditLang;
  nameI18nEn: string;
  nameI18nVi: string;
  nameI18nJa: string;
  descI18nEn: string;
  descI18nVi: string;
  descI18nJa: string;
  onOpenI18nName: () => void;
  onOpenI18nDesc: () => void;
  imageTreeOpen: boolean;
  imageTree: FileTreeItem[] | null;
  imageTreeLoading: boolean;
  imageTreeExpanded: Set<string>;
  onRequestClose: () => void;
  onSave: () => void;
  onDelete: () => void | Promise<void>;
  onToggleTree: () => void;
  onToggleTreeExpanded: (path: string) => void;
  onSelectImage: (path: string) => void;
  onCloseTree: () => void;
  allCards: AdventureCard[];
  onOpenClassNamePicker: () => void;
}

export function AdventureCardDetailDrawer({
  editCard,
  form,
  setForm,
  error,
  saveLoading,
  deleteLoading,
  editLang,
  nameI18nEn,
  nameI18nVi,
  nameI18nJa,
  descI18nEn,
  descI18nVi,
  descI18nJa,
  onOpenI18nName,
  onOpenI18nDesc,
  imageTreeOpen,
  imageTree,
  imageTreeLoading,
  imageTreeExpanded,
  onRequestClose,
  onSave,
  onDelete,
  onToggleTree,
  onToggleTreeExpanded,
  onSelectImage,
  onCloseTree,
  allCards,
  onOpenClassNamePicker,
}: AdventureCardDetailDrawerProps) {
  const [isPresent, safeToRemove] = usePresence();
  const [classCodeOpen, setClassCodeOpen] = useState(false);
  const [attachedOpen, setAttachedOpen] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const namePreview =
    editLang === 'en' ? nameI18nEn : editLang === 'vi' ? nameI18nVi : nameI18nJa;
  const descriptionPreview =
    editLang === 'en' ? descI18nEn : editLang === 'vi' ? descI18nVi : descI18nJa;

  const cardType = (form.type ?? editCard.type) as string;
  const rawClassName = (form.className ?? editCard.className ?? '').trim();
  const classStem = rawClassName.replace(/\.ts$/i, '').split('/').pop() ?? '';
  /** Đường dẫn đầy đủ dưới models/cards khi DB lưu dạng weapon/catalyst/CatalystForest */
  const modelsRelativeTsPath = rawClassName.replace(/\.ts$/i, '').includes('/')
    ? rawClassName.replace(/\.ts$/i, '')
    : '';

  const dragControls = useDragControls();
  const panelRef = useRef<HTMLDivElement>(null);
  const [panelWidth, setPanelWidth] = useState(0);

  useEffect(() => {
    setClassCodeOpen(false);
    setAttachedOpen(false);
    setShowDeleteConfirm(false);
  }, [editCard._id]);

  useLayoutEffect(() => {
    const el = panelRef.current;
    if (!el) return;
    const measure = () => {
      if (!panelRef.current) return;
      setPanelWidth(panelRef.current.getBoundingClientRect().width);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    window.addEventListener('resize', measure);
    return () => {
      window.removeEventListener('resize', measure);
      ro.disconnect();
    };
  }, [editCard._id]);

  const handleRequestClose = useCallback(() => {
    if (attachedOpen) {
      setAttachedOpen(false);
      return;
    }
    if (classCodeOpen) {
      setClassCodeOpen(false);
      return;
    }
    if (showDeleteConfirm) {
      setShowDeleteConfirm(false);
      return;
    }
    onRequestClose();
  }, [attachedOpen, classCodeOpen, showDeleteConfirm, onRequestClose]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.preventDefault();
      handleRequestClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleRequestClose]);

  const maxDragRight =
    panelWidth > 0 ? panelWidth : typeof window !== 'undefined' ? Math.min(1200, window.innerWidth * 0.92) : 800;

  const startDrawerDrag = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    dragControls.start(e);
  };

  const requestDelete = () => {
    if (deleteLoading || showDeleteConfirm) return;
    setShowDeleteConfirm(true);
  };

  const adventureFabPortal =
    typeof document !== 'undefined'
      ? createPortal(
          <BottomDockFabShell>
            <DockFabMotionGroup
              aria-label="Thao tác adventure card"
              className="ml-[250px]"
              initial={{ y: 72, opacity: 0 }}
              animate={isPresent ? { y: 0, opacity: 1 } : { y: 72, opacity: 0 }}
              transition={equipmentDockFabTransition}
              onAnimationComplete={() => {
                if (!isPresent) safeToRemove();
              }}
            >
              <DockFabButtonRow>
                <DockPeekFabButton
                  tone="primary"
                  onClick={() => void onSave()}
                  disabled={saveLoading || deleteLoading}
                  title="Lưu"
                  aria-label="Lưu"
                >
                  {saveLoading ? (
                    <span
                      className={`inline-block ${dockPeekFabIconClassName} animate-spin rounded-full border-2 border-white/35 border-t-white`}
                      aria-hidden
                    />
                  ) : (
                    <FontAwesomeIcon icon={faFloppyDisk} className={dockPeekFabIconClassName} aria-hidden />
                  )}
                </DockPeekFabButton>
                <DockPeekFabButton
                  tone="destructive"
                  onClick={() => {
                    setAttachedOpen(false);
                    requestDelete();
                  }}
                  disabled={deleteLoading || saveLoading || showDeleteConfirm}
                  title="Xóa thẻ"
                  aria-label="Xóa thẻ"
                >
                  <FontAwesomeIcon icon={faTrash} className={dockPeekFabIconClassName} aria-hidden />
                </DockPeekFabButton>
                <DockPeekFabButton
                  tone={classCodeOpen ? 'slateActive' : 'slate'}
                  onClick={() => {
                    setClassCodeOpen((v) => !v);
                    setAttachedOpen(false);
                  }}
                  title={classCodeOpen ? 'Đóng trình sửa class' : 'Mở trình sửa class (.ts)'}
                  aria-label={classCodeOpen ? 'Đóng trình sửa class' : 'Mở trình sửa class'}
                  aria-pressed={classCodeOpen}
                >
                  <FontAwesomeIcon icon={faCode} className={dockPeekFabIconClassName} aria-hidden />
                </DockPeekFabButton>
                <DockPeekFabButton
                  tone={attachedOpen ? 'slateActive' : 'slate'}
                  onClick={() => {
                    setAttachedOpen((v) => !v);
                    setClassCodeOpen(false);
                  }}
                  title={attachedOpen ? 'Đóng ảnh đính kèm' : 'Ảnh đính kèm'}
                  aria-label={attachedOpen ? 'Đóng ảnh đính kèm' : 'Ảnh đính kèm'}
                  aria-pressed={attachedOpen}
                >
                  <FontAwesomeIcon icon={faPaperclip} className={dockPeekFabIconClassName} aria-hidden />
                </DockPeekFabButton>
              </DockFabButtonRow>
            </DockFabMotionGroup>
          </BottomDockFabShell>,
          document.body
        )
      : null;

  return (
    <>
      <motion.div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-roledescription="drawer"
        aria-label="Chi tiết adventure card — kéo cạnh trái sang phải hoặc nhấn Esc để đóng"
        initial="hidden"
        animate="visible"
        exit="exit"
        variants={slideInCharacterDrawer}
        drag="x"
        dragControls={dragControls}
        dragListener={false}
        dragConstraints={{ left: 0, right: maxDragRight }}
        dragElastic={{ left: 0, right: 0.18 }}
        dragMomentum={false}
        onDragEnd={(_, info) => {
          if (info.offset.x > 56 || info.velocity.x > 380) {
            handleRequestClose();
          }
        }}
        className={
          'pointer-events-auto z-[60] flex h-full min-h-0 min-w-0 flex-1 flex-row self-stretch ' +
          'overflow-hidden border-l border-border/80 bg-background ' +
          'shadow-[0_12px_48px_-12px_rgba(15,23,42,0.25),0_4px_16px_-4px_rgba(15,23,42,0.12)] ' +
          'ring-1 ring-slate-900/[0.06]'
        }
      >
        <div
          className="flex w-5 min-w-[20px] shrink-0 cursor-grab touch-none items-center justify-center self-stretch bg-muted/15 active:cursor-grabbing"
          aria-hidden={true}
          role="presentation"
          title="Kéo sang phải để đóng — hoặc nhấn Esc"
          onPointerDown={startDrawerDrag}
        >
          <div className="h-14 w-1.5 shrink-0 rounded-full bg-muted-foreground/35" />
        </div>
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          <div
            className={
              'flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain touch-pan-y ' +
              'pb-[max(6rem,calc(4.5rem+env(safe-area-inset-bottom,0px)))] ' +
              '[scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:h-0 [&::-webkit-scrollbar]:w-0'
            }
          >
            <div className="p-6 max-w-full">
              {error && (
                <div className="mb-4 rounded bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</div>
              )}
              {classCodeOpen ? (
                <motion.div
                  className="space-y-4 rounded-xl border border-slate-200 bg-white p-3 md:p-4 dark:border-border dark:bg-background"
                  variants={fadeSlideCard}
                  initial="hidden"
                  animate="visible"
                >
                  {classStem && (cardType || modelsRelativeTsPath) ? (
                    <SourceClassEditor
                      type={cardType}
                      className={classStem}
                      modelsRelativeTsPath={modelsRelativeTsPath}
                    />
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Chọn type và class name trong form để mở file{' '}
                      <code className="rounded bg-muted px-1">models/cards/&lt;type&gt;/&lt;Class&gt;.ts</code>.
                    </p>
                  )}
                </motion.div>
              ) : attachedOpen ? (
                <AttachedPanel
                  entityId={editCard._id}
                  attached={form.attached ?? editCard.attached}
                  saveLoading={saveLoading}
                  context="adventureCard"
                  onPersistAttached={(next) => setForm((p) => ({ ...p, attached: next }))}
                />
              ) : (
                <>
                  <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,240px),1fr] lg:items-start">
                    <div className="space-y-3 lg:sticky lg:top-0 lg:z-10 lg:self-start">
                      <AdventureCardImagePicker
                        card={editCard}
                        formImage={form.image}
                        isTreeOpen={imageTreeOpen}
                        onToggleTree={onToggleTree}
                        imageTree={imageTree}
                        imageTreeLoading={imageTreeLoading}
                        imageTreeExpanded={imageTreeExpanded}
                        onToggleExpanded={onToggleTreeExpanded}
                        onSelectImage={onSelectImage}
                        onCloseTree={onCloseTree}
                      />
                    </div>
                    <AdventureCardEditForm
                      card={editCard}
                      form={form}
                      setForm={setForm}
                      namePreview={namePreview}
                      descriptionPreview={descriptionPreview}
                      onOpenI18nName={onOpenI18nName}
                      onOpenI18nDesc={onOpenI18nDesc}
                      onOpenClassNamePicker={onOpenClassNamePicker}
                    />
                  </div>

                  {(form.type ?? editCard.type) === 'treasure' && (
                    <div className="mt-6 border-t border-border pt-6">
                      <CardDeckBuilder
                        cardIds={contentsToIds(form.contents ?? editCard.contents)}
                        availableCards={allCards}
                        onDeckChange={(newIds) => setForm((p) => ({ ...p, contents: newIds }))}
                        getImageUrl={getAdventureCardImageUrl}
                        deckLabel="🎁 Rương (nội dung rương)"
                        sourceLabel="Thẻ có sẵn (kéo vào rương)"
                      />
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </motion.div>
      {adventureFabPortal}
      <ConfirmDangerDialog
        open={showDeleteConfirm}
        onCancel={() => !deleteLoading && setShowDeleteConfirm(false)}
        onConfirm={() => {
          void (async () => {
            try {
              await Promise.resolve(onDelete());
            } catch {
              setShowDeleteConfirm(false);
            }
          })();
        }}
        confirmLoading={deleteLoading}
        title="Xóa adventure card?"
        description={`Thẻ sẽ bị xóa vĩnh viễn (nameId: ${editCard.nameId}). Thao tác không hoàn tác.`}
        confirmLabel="Xóa"
      />
    </>
  );
}
