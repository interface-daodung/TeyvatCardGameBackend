import { useId } from 'react';
import { createPortal } from 'react-dom';
import { Button } from './ui/button';

export interface ConfirmDangerDialogProps {
  open: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  /** Đang xử lý hành động xác nhận (khóa nút, đổi nhãn) */
  confirmLoading?: boolean;
  title?: string;
  description: string;
  cancelLabel?: string;
  confirmLabel?: string;
  confirmLoadingLabel?: string;
  /** class z-index cho lớp phủ */
  overlayClassName?: string;
}

const defaultTitle = 'Confirm?';

/**
 * Popup xác nhận hành động nguy hiểm (xóa, gỡ, v.v.), dùng chung admin.
 * Backdrop / nút ✕ / Hủy = onCancel; nút xác nhận = onConfirm.
 */
export function ConfirmDangerDialog({
  open,
  onCancel,
  onConfirm,
  confirmLoading = false,
  title = defaultTitle,
  description,
  cancelLabel = 'Cancel',
  confirmLabel = 'Delete',
  confirmLoadingLabel = 'Processing…',
  /** Trên header (z-40) và vùng #admin-main-scroll (z-30); portal ra body để không bị kẹt stacking context */
  overlayClassName = 'z-[10050]',
}: ConfirmDangerDialogProps) {
  const titleId = useId();

  if (!open) return null;

  const node = (
    <div className={`fixed inset-0 flex items-center justify-center p-4 ${overlayClassName}`}>
      <div
        className="absolute inset-0 bg-black/60"
        onClick={onCancel}
        aria-hidden
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative z-10 w-full max-w-md rounded-lg border border-border bg-card shadow-xl overflow-hidden"
      >
        <div className="flex shrink-0 items-center justify-between gap-2 border-b border-border bg-muted/30 px-4 py-3">
          <h3 id={titleId} className="min-w-0 pr-2 text-lg font-semibold text-destructive">
            {title}
          </h3>
          <button
            type="button"
            onClick={onCancel}
            disabled={confirmLoading}
            className="shrink-0 rounded-md p-1.5 text-xl leading-none text-foreground hover:bg-muted disabled:pointer-events-none disabled:opacity-50"
            aria-label="Close"
          >
            ✕
          </button>
        </div>
        <div className="space-y-4 p-4">
          <p className="text-sm text-muted-foreground">{description}</p>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={confirmLoading}
            >
              {cancelLabel}
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={onConfirm}
              disabled={confirmLoading}
            >
              {confirmLoading ? confirmLoadingLabel : confirmLabel}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(node, document.body) : null;
}
