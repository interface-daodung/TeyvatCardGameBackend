import { useCallback, useEffect, useMemo, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faImage, faPlus, faTrash } from '@fortawesome/free-solid-svg-icons';
import { motion } from 'framer-motion';
import { fadeSlideCard } from '../animations/motionPresets';
import { FileTreeNode } from '../FileTreeNode';
import { ImageLightbox, type LightboxImage } from '../ui/ImageLightbox';
import type { CharacterAttached } from '../../services/gameDataService';
import { filesService, type FileTreeItem } from '../../services/filesService';
import { cn } from '../../lib/utils';

function findDirChild(items: FileTreeItem[] | undefined, name: string): FileTreeItem | undefined {
  if (!items?.length) return undefined;
  const lower = name.toLowerCase();
  return items.find((n) => n.type === 'dir' && n.name.toLowerCase() === lower);
}

function stemFromWebPath(p: string): string {
  const base = p.split('/').pop() ?? 'skill';
  return base.replace(/\.[^.]+$/, '') || 'skill';
}

export interface CharacterAttachedPanelProps {
  /** `_id` — key ổn định cho input */
  entityId: string;
  attached: CharacterAttached[] | undefined;
  saveLoading: boolean;
  onPersistAttached: (attached: CharacterAttached[]) => void | Promise<void>;
  /** `adventureCard` / `item`: copy form + Lưu; mặc định nhân vật (lưu ngay) */
  context?: 'character' | 'adventureCard' | 'item';
}

export function CharacterAttachedPanel({
  entityId,
  attached: attachedProp,
  saveLoading,
  onPersistAttached,
  context = 'character',
}: CharacterAttachedPanelProps) {
  const attached = attachedProp ?? [];

  const [fullImageTree, setFullImageTree] = useState<FileTreeItem[] | null>(null);
  const [imageTreeLoading, setImageTreeLoading] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickAction, setPickAction] = useState<'add' | { index: number } | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [imageLightbox, setImageLightbox] = useState<LightboxImage | null>(null);

  const skillSubtree = useMemo(() => {
    if (!fullImageTree?.length) return [];
    const skill = findDirChild(fullImageTree, 'skill');
    return skill?.children ?? [];
  }, [fullImageTree]);

  useEffect(() => {
    let cancelled = false;
    setImageTreeLoading(true);
    filesService
      .getImageTree('manager-assets')
      .then((t) => {
        if (!cancelled) setFullImageTree(t);
      })
      .catch(() => {
        if (!cancelled) setFullImageTree([]);
      })
      .finally(() => {
        if (!cancelled) setImageTreeLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const toggleExpanded = useCallback((path: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  }, []);

  const openPickerAdd = () => {
    setPickAction('add');
    setPickerOpen(true);
  };

  const openPickerForRow = (index: number) => {
    setPickAction({ index });
    setPickerOpen(true);
  };

  const closePicker = () => {
    setPickerOpen(false);
    setPickAction(null);
  };

  const onSelectFile = async (path: string) => {
    if (!path || !pickAction) return;
    const base = attachedProp ?? [];
    if (pickAction === 'add') {
      const nameId = stemFromWebPath(path);
      await onPersistAttached([...base, { nameId, image: path }]);
    } else {
      const i = pickAction.index;
      const next = base.map((a, j) => (j === i ? { ...a, image: path } : a));
      await onPersistAttached(next);
    }
    closePicker();
  };

  const removeRow = async (index: number) => {
    const base = attachedProp ?? [];
    await onPersistAttached(base.filter((_, j) => j !== index));
  };

  const commitNameId = async (index: number, raw: string) => {
    const nameId = raw.trim();
    if (!nameId) return;
    const base = attachedProp ?? [];
    const next = base.map((a, j) => (j === index ? { ...a, nameId } : a));
    await onPersistAttached(next);
  };

  return (
    <motion.div
      className="relative flex min-h-[300px] max-h-[500px] flex-col overflow-hidden rounded-xl border border-slate-200 bg-white"
      variants={fadeSlideCard}
      initial="hidden"
      animate="visible"
    >
      <div className="shrink-0 border-b border-slate-100 px-3 py-3 md:px-4">
        <h3 className="text-sm font-semibold text-slate-900">
          {context === 'adventureCard'
            ? 'Ảnh đính kèm (adventure card)'
            : context === 'item'
              ? 'Ảnh đính kèm (item)'
              : 'Ảnh kỹ năng đính kèm'}
        </h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Chọn ảnh từ{' '}
          <code className="rounded bg-muted px-1 py-0.5 text-[11px]">assets/images/skill</code> (cây thư
          mục). Mỗi mục: định danh <span className="font-medium">nameId</span> + đường dẫn ảnh —{' '}
          {context === 'character'
            ? 'lưu trong nhân vật.'
            : 'cập nhật form và nhấn Lưu để ghi vào cơ sở dữ liệu.'}
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => openPickerAdd()}
            disabled={saveLoading}
            className={cn(
              'inline-flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary',
              'hover:bg-primary/15 disabled:pointer-events-none disabled:opacity-50'
            )}
          >
            <FontAwesomeIcon icon={faPlus} className="h-3.5 w-3.5" aria-hidden />
            Thêm (chọn ảnh trong skill)
          </button>
          {saveLoading && (
            <span className="text-xs text-muted-foreground">Đang lưu…</span>
          )}
        </div>
      </div>

      <div className="relative min-h-0 flex-1 overflow-y-auto px-3 py-3 md:px-4">
        {attached.length === 0 ? (
          <p className="text-sm text-muted-foreground">Chưa có ảnh đính kèm. Nhấn &quot;Thêm&quot; để chọn file trong cây skill.</p>
        ) : (
          <ul className="space-y-3">
            {attached.map((row, index) => (
              <li
                key={`${row.nameId}-${index}`}
                className="flex flex-wrap items-start gap-3 rounded-lg border border-slate-100 bg-slate-50/80 p-3"
              >
                <div
                  className={
                    row.image?.trim()
                      ? 'relative h-16 w-16 shrink-0 cursor-zoom-in overflow-hidden rounded-md border border-slate-200 bg-white outline-none ring-offset-2 focus-visible:ring-2 focus-visible:ring-primary'
                      : 'relative h-16 w-16 shrink-0 overflow-hidden rounded-md border border-slate-200 bg-white'
                  }
                  role={row.image?.trim() ? 'button' : undefined}
                  tabIndex={row.image?.trim() ? 0 : undefined}
                  title={
                    row.image?.trim()
                      ? 'Double-click hoặc Enter để xem phóng to'
                      : undefined
                  }
                  onDoubleClick={(e) => {
                    e.preventDefault();
                    const src = row.image?.trim();
                    if (src) setImageLightbox({ src, alt: row.nameId });
                  }}
                  onKeyDown={(e) => {
                    if (!row.image?.trim()) return;
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setImageLightbox({ src: row.image.trim(), alt: row.nameId });
                    }
                  }}
                >
                  {row.image?.trim() ? (
                    <img
                      src={row.image}
                      alt=""
                      className="pointer-events-none h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-[10px] text-muted-foreground">
                      —
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1 space-y-2">
                  <label className="block text-[11px] font-medium text-slate-600">
                    nameId
                    <input
                      type="text"
                      defaultValue={row.nameId}
                      key={`${entityId}-att-${index}-${row.nameId}`}
                      disabled={saveLoading}
                      onBlur={(e) => void commitNameId(index, e.target.value)}
                      className="mt-0.5 w-full rounded border border-slate-200 bg-white px-2 py-1 text-sm text-slate-900"
                    />
                  </label>
                  <p className="truncate text-[11px] text-muted-foreground" title={row.image}>
                    {row.image || 'Chưa chọn ảnh'}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col gap-1.5 sm:flex-row">
                  <button
                    type="button"
                    title="Đổi ảnh (cây skill)"
                    aria-label="Đổi ảnh"
                    disabled={saveLoading}
                    onClick={() => openPickerForRow(index)}
                    className="inline-flex items-center justify-center rounded-md border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-700 hover:bg-slate-100 disabled:opacity-50"
                  >
                    <FontAwesomeIcon icon={faImage} className="h-3.5 w-3.5" aria-hidden />
                  </button>
                  <button
                    type="button"
                    title="Xóa mục"
                    aria-label="Xóa mục"
                    disabled={saveLoading}
                    onClick={() => void removeRow(index)}
                    className="inline-flex items-center justify-center rounded-md border border-red-200 bg-white px-2 py-1.5 text-xs text-red-600 hover:bg-red-50 disabled:opacity-50"
                  >
                    <FontAwesomeIcon icon={faTrash} className="h-3.5 w-3.5" aria-hidden />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {pickerOpen && (
        <div className="absolute inset-0 z-20 flex flex-col overflow-hidden bg-white">
          <div className="flex shrink-0 items-center justify-between border-b border-border bg-muted px-3 py-2 text-xs font-medium">
            <span className="truncate pr-2">
              Chọn ảnh —{' '}
              <code className="text-[11px]">/assets/images/skill</code> (và thư mục con)
            </span>
            <button
              type="button"
              onClick={closePicker}
              className="shrink-0 rounded px-2 py-1 hover:bg-muted-foreground/15"
            >
              Đóng
            </button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto p-2 text-xs">
            {imageTreeLoading ? (
              <p className="text-muted-foreground">Đang tải cây thư mục…</p>
            ) : skillSubtree.length > 0 ? (
              skillSubtree.map((item) => (
                <FileTreeNode
                  key={item.path}
                  item={item}
                  expanded={expanded}
                  onToggle={toggleExpanded}
                  onSelect={onSelectFile}
                />
              ))
            ) : (
              <p className="text-muted-foreground">
                Không tìm thấy thư mục <strong>skill</strong> trong assets hoặc thư mục trống.
              </p>
            )}
          </div>
        </div>
      )}

      <ImageLightbox open={imageLightbox} onClose={() => setImageLightbox(null)} />
    </motion.div>
  );
}
