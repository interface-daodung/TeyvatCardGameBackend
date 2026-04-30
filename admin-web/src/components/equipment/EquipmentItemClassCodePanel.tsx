import { useState } from 'react';
import { createPortal } from 'react-dom';
import { SourceClassEditor } from '../code/SourceClassEditor';
import { ClassNamePickerPanel } from '../adventureCards/ClassNamePickerPanel';

interface EquipmentItemClassCodePanelProps {
  /** Đường dẫn file .ts tương đối `models/items` (lưu trong Item.className). */
  itemRelativePath: string;
  onChangePath: (path: string) => void;
  /** `fullDrawer`: màn code toàn drawer — placeholder/editor cao hơn. */
  variant?: 'split' | 'fullDrawer';
}

export function EquipmentItemClassCodePanel({
  itemRelativePath,
  onChangePath,
  variant = 'split',
}: EquipmentItemClassCodePanelProps) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const trimmed = itemRelativePath.trim();
  const hasPath = trimmed.length > 0;
  const isFull = variant === 'fullDrawer';

  return (
    <>
      <div
        className={
          isFull
            ? 'flex min-h-[min(42dvh,22rem)] w-full min-w-0 flex-1 flex-col gap-3'
            : 'flex min-h-0 w-full min-w-0 flex-col gap-3'
        }
      >
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="text-xs font-medium text-muted-foreground">Item class (TeyvatCard)</span>
          {hasPath ? (
            <button
              type="button"
              className="text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
              onClick={() => onChangePath('')}
            >
              Unlink
            </button>
          ) : null}
        </div>
        {hasPath ? (
          <div
            className={
              isFull
                ? 'flex min-h-[min(36dvh,18rem)] min-w-0 flex-1 flex-col'
                : 'min-h-0 w-full min-w-0'
            }
          >
            <SourceClassEditor editorMode="item" itemRelativePath={trimmed} />
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setPickerOpen(true)}
            className={
              isFull
                ? 'flex min-h-[min(40dvh,16rem)] w-full flex-1 flex-col items-center justify-center rounded-lg border border-dashed border-muted-foreground/40 bg-muted/25 px-4 py-6 text-center font-mono text-sm text-muted-foreground transition-colors hover:bg-muted/45'
                : 'flex min-h-[min(40vh,14rem)] w-full flex-col items-center justify-center rounded-lg border border-dashed border-muted-foreground/40 bg-muted/25 px-4 py-8 text-center font-mono text-sm text-muted-foreground transition-colors hover:bg-muted/45 lg:min-h-[min(48vh,18rem)]'
            }
          >
            <code className="block text-base text-muted-foreground/90">ts-morph edit</code>
            <span className="mt-3 block max-w-sm text-xs font-sans leading-relaxed text-muted-foreground">
              Select class file in <span className="font-mono">models/items</span>
            </span>
          </button>
        )}
      </div>

      {pickerOpen &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            className="fixed inset-0 z-[300] flex items-center justify-center bg-black/50 p-3 sm:p-4"
            role="presentation"
            onClick={() => setPickerOpen(false)}
          >
            <div className="max-h-[min(90vh,720px)] w-full max-w-md overflow-auto" onClick={(e) => e.stopPropagation()}>
              <ClassNamePickerPanel
                modelsScope="items"
                selectionMode="relativePath"
                currentValue={trimmed}
                title="Select item class"
                onSelect={(path) => {
                  onChangePath(path);
                }}
                onClose={() => setPickerOpen(false)}
              />
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
