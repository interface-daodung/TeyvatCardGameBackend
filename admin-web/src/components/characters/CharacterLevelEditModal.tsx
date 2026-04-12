import { useLayoutEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSquarePen } from '@fortawesome/free-solid-svg-icons';
import { Button } from '../ui/button';
import { UnsavedChangesDialog, useUnsavedBaseline } from '../share';

type LevelModalSnapshot = {
  max: number;
  rows: { level: number; price: number }[];
};

export interface CharacterLevelEditModalProps {
  open: boolean;
  onClose: () => void;
  onSave: () => void | Promise<void>;
  saveLoading: boolean;
  displayLevel: number;
  onDisplayLevelChange: (fn: (l: number) => number) => void;
  levelPrices: { level: number; price: number }[];
  editingPriceForLevel: number | null;
  editedPriceValue: string;
  onEditedPriceValueChange: (value: string) => void;
  onSavePriceEdit: (level: number) => void;
  onStartPriceEdit: (level: number, price: number) => void;
}

export function CharacterLevelEditModal({
  open,
  onClose,
  onSave,
  saveLoading,
  displayLevel,
  onDisplayLevelChange,
  levelPrices,
  editingPriceForLevel,
  editedPriceValue,
  onEditedPriceValueChange,
  onSavePriceEdit,
  onStartPriceEdit,
}: CharacterLevelEditModalProps) {
  const { setBaseline, clearBaseline, isDirty } = useUnsavedBaseline<LevelModalSnapshot>();
  const [unsavedOpen, setUnsavedOpen] = useState(false);

  useLayoutEffect(() => {
    if (open) {
      setBaseline({
        max: displayLevel,
        rows: levelPrices.map((r) => ({ level: r.level, price: r.price })),
      });
    } else {
      clearBaseline();
      setUnsavedOpen(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- baseline chỉ khi mở/đóng modal
  }, [open, setBaseline, clearBaseline]);

  const snapshotNow = (): LevelModalSnapshot => ({
    max: displayLevel,
    rows: levelPrices.map((r) => ({ level: r.level, price: r.price })),
  });

  const requestClose = () => {
    if (!open) return;
    if (isDirty(snapshotNow())) setUnsavedOpen(true);
    else onClose();
  };

  if (!open) return null;

  const content = (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4"
      onClick={requestClose}
      role="presentation"
    >
      <div
        className="flex w-full max-h-[92vh] max-w-3xl flex-col overflow-hidden rounded-lg border border-border bg-card shadow-xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="character-level-edit-title"
      >
        <div className="flex items-center justify-between border-b border-blue-700/20 bg-blue-600 px-5 py-4 text-white">
          <h3 id="character-level-edit-title" className="text-xl font-semibold">
            Chỉnh Level &amp; giá upgrade
          </h3>
          <button
            type="button"
            onClick={requestClose}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-lg leading-none text-white/90 transition-colors hover:bg-white/15"
            aria-label="Đóng"
          >
            ✕
          </button>
        </div>
        <div className="flex-1 space-y-4 overflow-y-auto p-5">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-medium text-muted-foreground">Bảng giá upgrade theo level</p>
            <div className="flex items-center gap-1">
              <span className="text-xs text-muted-foreground">level max</span>
              <span className="min-w-[1.25rem] text-center text-xs font-semibold">{displayLevel}</span>
              <button
                type="button"
                onClick={() => onDisplayLevelChange((l) => Math.max(1, l - 1))}
                className="flex h-5 w-5 items-center justify-center rounded border border-gray-300 bg-gray-100 text-xs font-bold leading-none hover:bg-gray-200"
              >
                −
              </button>
              <button
                type="button"
                onClick={() => onDisplayLevelChange((l) => l + 1)}
                className="flex h-5 w-5 items-center justify-center rounded border border-gray-300 bg-gray-100 text-xs font-bold leading-none hover:bg-gray-200"
              >
                +
              </button>
            </div>
          </div>
          <div className="space-y-2">
            {levelPrices.map(({ level, price }) => {
              if (editingPriceForLevel === level) {
                return (
                  <div
                    key={level}
                    className="flex items-center justify-between gap-3 rounded-lg bg-gray-50 px-3 py-3 text-sm"
                  >
                    <span className="font-medium">Level {level}</span>
                    <input
                      type="number"
                      value={editedPriceValue}
                      onChange={(e) => onEditedPriceValueChange(e.target.value)}
                      onBlur={() => onSavePriceEdit(level)}
                      onKeyDown={(e) => e.key === 'Enter' && onSavePriceEdit(level)}
                      onClick={(e) => e.stopPropagation()}
                      className="w-24 rounded border border-gray-300 px-2 py-1.5 text-sm font-medium"
                      autoFocus
                    />
                  </div>
                );
              }
              return (
                <button
                  key={level}
                  type="button"
                  onClick={() => onStartPriceEdit(level, price)}
                  className="group flex w-full items-center justify-between rounded-lg bg-gray-50 px-3 py-3 text-left text-sm transition-colors hover:bg-gray-100"
                >
                  <span className="font-medium">Level {level}</span>
                  <span className="flex shrink-0 items-center gap-2">
                    <span className="text-gray-600">price {price}</span>
                    <FontAwesomeIcon
                      icon={faSquarePen}
                      className="h-3.5 w-3.5 opacity-40 transition-opacity group-hover:opacity-70"
                    />
                  </span>
                </button>
              );
            })}
          </div>
        </div>
        <div className="flex gap-3 border-t border-border p-5">
          <Button
            type="button"
            onClick={() => void onSave()}
            className="flex-1 bg-blue-600 hover:bg-blue-700"
            disabled={saveLoading}
          >
            {saveLoading ? 'Đang lưu...' : 'Lưu'}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={requestClose}
            className="flex-1"
            disabled={saveLoading}
          >
            Hủy
          </Button>
        </div>
      </div>
    </div>
  );

  return createPortal(
    <>
      {content}
      <UnsavedChangesDialog
        open={unsavedOpen}
        onStay={() => setUnsavedOpen(false)}
        onDiscard={() => {
          setUnsavedOpen(false);
          onClose();
        }}
        onSave={() => {
          void (async () => {
            try {
              await Promise.resolve(onSave());
              setUnsavedOpen(false);
            } catch {
              return;
            }
          })();
        }}
        saveLoading={saveLoading}
        title="Lưu thay đổi Level?"
        description="Bạn đã chỉnh level max hoặc giá upgrade. Lưu trước khi đóng?"
        overlayClassName="z-[10001]"
      />
    </>,
    document.body
  );
}
