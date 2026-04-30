import { useId } from 'react';
import { Button } from '../ui/button';

export interface UnsavedChangesDialogProps {
    open: boolean;
    /** Đóng dialog (Ở lại chỉnh sửa): X, hoặc click nền */
    onStay: () => void;
    onDiscard: () => void;
    onSave: () => void;
    saveLoading?: boolean;
    saveDisabled?: boolean;
    title?: string;
    description?: string;
    /** class z-index cho lớp phủ (mặc định cao hơn modal cha) */
    overlayClassName?: string;
}

const defaultTitle = 'Save changes?';
const defaultDescription = 'You have unsaved edits. Save before closing?';

/**
 * Popup xác nhận khi đóng form còn thay đổi chưa lưu.
 * Nút X ở góc phải header = ở lại chỉnh sửa.
 */
export function UnsavedChangesDialog({
    open,
    onStay,
    onDiscard,
    onSave,
    saveLoading = false,
    saveDisabled = false,
    title = defaultTitle,
    description = defaultDescription,
    overlayClassName = 'z-[10000]',
}: UnsavedChangesDialogProps) {
    const titleId = useId();

    if (!open) return null;

    return (
        <div className={`fixed inset-0 flex items-center justify-center p-4 ${overlayClassName}`}>
            <div className="absolute inset-0 bg-black/60" onClick={onStay} aria-hidden />
            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleId}
                className="relative z-10 w-full max-w-md rounded-lg bg-card border border-border shadow-xl overflow-hidden"
            >
                <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-border bg-muted/30 shrink-0">
                    <h3 id={titleId} className="text-lg font-semibold pr-2 min-w-0">
                        {title}
                    </h3>
                    <button
                        type="button"
                        onClick={onStay}
                        className="shrink-0 p-1.5 rounded-md hover:bg-muted text-xl leading-none text-foreground"
                        aria-label="Close"
                    >
                        ✕
                    </button>
                </div>
                <div className="p-4 space-y-4">
                    <p className="text-sm text-muted-foreground">{description}</p>
                    <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
                        <Button type="button" variant="destructive" onClick={onDiscard}>
                            Discard
                        </Button>
                        <Button
                            type="button"
                            onClick={onSave}
                            disabled={saveDisabled || saveLoading}
                        >
                            {saveLoading ? 'Saving...' : 'Save'}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
