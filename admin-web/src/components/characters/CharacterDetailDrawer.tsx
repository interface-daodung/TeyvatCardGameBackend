import { useLayoutEffect, useRef, useState } from 'react';
import { motion, useDragControls } from 'framer-motion';
import { Button } from '../ui/button';
import { slideInCharacterDrawer } from '../animations/motionPresets';
import { CharacterDetailView } from './CharacterDetailView';
import type { UseCharacterDetailLangControl } from './useCharacterDetail';

export interface CharacterDetailDrawerProps {
  nameId: string;
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
  onClose,
  langControl,
}: CharacterDetailDrawerProps) {
  const dragControls = useDragControls();
  const panelRef = useRef<HTMLDivElement>(null);
  const [panelWidth, setPanelWidth] = useState(0);

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

  const maxDragRight =
    panelWidth > 0 ? panelWidth : typeof window !== 'undefined' ? Math.min(1200, window.innerWidth * 0.92) : 800;

  const startDrawerDrag = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    dragControls.start(e);
  };

  return (
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
            className="flex shrink-0 cursor-grab touch-none select-none items-center justify-between gap-2 border-b border-border/50 px-3 py-2.5 active:cursor-grabbing"
            title="Kéo sang phải để đóng"
            onPointerDown={(e) => {
              if ((e.target as HTMLElement).closest('button')) return;
              startDrawerDrag(e);
            }}
          >
            <h2 className="text-sm font-semibold tracking-tight truncate">Chi tiết nhân vật</h2>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="shrink-0"
              onClick={onClose}
              aria-label="Đóng"
            >
              Đóng
            </Button>
          </div>
          <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain touch-pan-y">
            <CharacterDetailView
              nameId={nameId}
              variant="drawer"
              onNavigateBack={onClose}
              langControl={langControl}
            />
          </div>
        </div>
    </motion.div>
  );
}
