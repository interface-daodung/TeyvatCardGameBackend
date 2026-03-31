import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, useDragControls, usePresence } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCode, faCodeBranch, faTrash } from '@fortawesome/free-solid-svg-icons';
import { equipmentDockFabTransition, slideInCharacterDrawer } from '../animations/motionPresets';
import { CharacterDetailView } from './CharacterDetailView';
import type { UseCharacterDetailLangControl } from './useCharacterDetail';
import { ConfirmDangerDialog } from '../ConfirmDangerDialog';
import {
  BottomDockFabShell,
  DockFabButtonRow,
  DockFabMotionGroup,
  DockPeekFabButton,
  dockPeekFabIconClassName,
} from '../share';
import { gameDataService } from '../../services/gameDataService';

export interface CharacterDetailDrawerProps {
  nameId: string;
  /** `_id` Mongo — dùng cho API xóa */
  characterId: string;
  onClose: () => void;
  langControl: UseCharacterDetailLangControl;
}

/**
 * ARIA không có role="drawer"; dùng role="dialog" + aria-roledescription để SR đọc đúng.
 *
 * Cùng hàng flex với lưới (flex-1, phần còn lại sau cột thẻ), không fixed — giống demo HTML (drawer mở cạnh grid).
 */
export function CharacterDetailDrawer({
  nameId,
  characterId,
  onClose,
  langControl,
}: CharacterDetailDrawerProps) {
  const [isPresent, safeToRemove] = usePresence();
  const dragControls = useDragControls();
  const panelRef = useRef<HTMLDivElement>(null);
  const [panelWidth, setPanelWidth] = useState(0);
  const [classCodeOpen, setClassCodeOpen] = useState(false);
  const [astFlowOpen, setAstFlowOpen] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    setClassCodeOpen(false);
    setAstFlowOpen(false);
    setShowDeleteConfirm(false);
  }, [nameId]);

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
  }, [nameId]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.preventDefault();
      onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  const maxDragRight =
    panelWidth > 0 ? panelWidth : typeof window !== 'undefined' ? Math.min(1200, window.innerWidth * 0.92) : 800;

  const startDrawerDrag = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    dragControls.start(e);
  };

  const canDelete = Boolean(characterId);

  const requestDelete = () => {
    if (!canDelete || deleteLoading) return;
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    if (!canDelete) return;
    setDeleteLoading(true);
    try {
      await gameDataService.deleteCharacter(characterId);
      setShowDeleteConfirm(false);
      onClose();
    } catch {
      setDeleteLoading(false);
    }
  };

  const characterFabPortal =
    typeof document !== 'undefined'
      ? createPortal(
          <BottomDockFabShell>
            <DockFabMotionGroup
              aria-label="Thao tác nhân vật"
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
                  tone="destructive"
                  onClick={requestDelete}
                  disabled={!canDelete || deleteLoading || showDeleteConfirm}
                  title="Xóa nhân vật"
                  aria-label="Xóa nhân vật"
                >
                  <FontAwesomeIcon
                    icon={faTrash}
                    className={dockPeekFabIconClassName}
                    aria-hidden
                  />
                </DockPeekFabButton>
                <DockPeekFabButton
                  tone={astFlowOpen ? 'astFlowOn' : 'astFlowOff'}
                  onClick={() => {
                    setAstFlowOpen((v) => !v);
                    setClassCodeOpen(false);
                  }}
                  title={astFlowOpen ? 'Đóng luồng AST' : 'Mở luồng AST (class)'}
                  aria-label={astFlowOpen ? 'Đóng luồng AST' : 'Mở luồng AST'}
                  aria-pressed={astFlowOpen}
                >
                  <FontAwesomeIcon
                    icon={faCodeBranch}
                    className={dockPeekFabIconClassName}
                    aria-hidden
                  />
                </DockPeekFabButton>
                <DockPeekFabButton
                  tone={classCodeOpen ? 'slateActive' : 'slate'}
                  onClick={() => {
                    setClassCodeOpen((v) => !v);
                    setAstFlowOpen(false);
                  }}
                  title={classCodeOpen ? 'Đóng trình sửa class' : 'Mở trình sửa class'}
                  aria-label={classCodeOpen ? 'Đóng trình sửa class' : 'Mở trình sửa class'}
                  aria-pressed={classCodeOpen}
                >
                  <FontAwesomeIcon
                    icon={faCode}
                    className={dockPeekFabIconClassName}
                    aria-hidden
                  />
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
        aria-label="Chi tiết nhân vật"
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
            onClose();
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
          aria-hidden
          role="presentation"
          title="Kéo sang phải để đóng"
          onPointerDown={startDrawerDrag}
        >
          <div className="h-14 w-1.5 shrink-0 rounded-full bg-muted-foreground/35" />
        </div>
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          <div
            className="flex shrink-0 cursor-grab touch-none select-none items-center border-b border-border/50 px-3 py-2.5 active:cursor-grabbing"
            title="Kéo sang phải để đóng — hoặc nhấn Esc"
            onPointerDown={startDrawerDrag}
          >
            <h2 className="text-sm font-semibold tracking-tight truncate">Chi tiết nhân vật</h2>
          </div>
          <div
            className={
              'flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain touch-pan-y ' +
              'pb-[max(6rem,calc(4.5rem+env(safe-area-inset-bottom,0px)))] ' +
              '[scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:h-0 [&::-webkit-scrollbar]:w-0'
            }
          >
            <CharacterDetailView
              nameId={nameId}
              onNavigateBack={onClose}
              langControl={langControl}
              drawerClassCodeOpen={classCodeOpen}
              drawerAstFlowOpen={astFlowOpen}
            />
          </div>
        </div>
      </motion.div>
      {characterFabPortal}
      <ConfirmDangerDialog
        open={showDeleteConfirm}
        onCancel={() => !deleteLoading && setShowDeleteConfirm(false)}
        onConfirm={() => void confirmDelete()}
        confirmLoading={deleteLoading}
        title="Xóa nhân vật?"
        description={`Nhân vật này sẽ bị xóa vĩnh viễn khỏi cơ sở dữ liệu (nameId: ${nameId}). Thao tác không hoàn tác.`}
        confirmLabel="Xóa"
      />
    </>
  );
}
