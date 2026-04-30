import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faImage, faPlus } from '@fortawesome/free-solid-svg-icons';
import { Button } from '../ui/button';
import { FileTreeNode } from '../FileTreeNode';
import { filesService, type FileTreeItem } from '../../services/filesService';
import { getItemImageSrcFromDb, onlyPositiveInt } from './equipmentUtils';
import { fadeInOverlay, scaleInModal } from '../animations/motionPresets';

const ITEM_LINK_PREFIX = '/assets/images/';

export interface EquipmentCreateFormValues {
  nameId: string;
  image: string;
  basePower: number;
  baseCooldown: number;
  maxLevel: number;
  unlockPrice: number;
}

interface EquipmentCreateModalProps {
  open: boolean;
  onClose: () => void;
  loading: boolean;
  error: string | null;
  onSubmit: (values: EquipmentCreateFormValues) => void | Promise<void>;
}

const DEFAULTS: EquipmentCreateFormValues = {
  nameId: '',
  image: '',
  basePower: 2,
  baseCooldown: 18,
  maxLevel: 1,
  unlockPrice: 0,
};

export function EquipmentCreateModal({
  open,
  onClose,
  loading,
  error,
  onSubmit,
}: EquipmentCreateModalProps) {
  const [form, setForm] = useState<EquipmentCreateFormValues>(DEFAULTS);
  const [imageTreeOpen, setImageTreeOpen] = useState(false);
  const [imageTree, setImageTree] = useState<FileTreeItem[] | null>(null);
  const [imageTreeLoading, setImageTreeLoading] = useState(false);
  const [imageTreeExpanded, setImageTreeExpanded] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (open) {
      setForm(DEFAULTS);
      setImageTreeOpen(false);
      setImageTreeExpanded(new Set());
    }
  }, [open]);

  const openImageTree = async () => {
    setImageTreeOpen(true);
    if (imageTree === null && !imageTreeLoading) {
      setImageTreeLoading(true);
      try {
        const tree = await filesService.getImageTree('item');
        setImageTree(tree);
      } catch {
        setImageTree([]);
      } finally {
        setImageTreeLoading(false);
      }
    }
  };

  const toggleImageTreeExpanded = (path: string) => {
    setImageTreeExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  };

  const selectImage = (webPath: string) => {
    setForm((p) => ({
      ...p,
      image: webPath.trim().replace(/\\/g, '/'),
    }));
    setImageTreeOpen(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const nameId = form.nameId.trim();
    if (!nameId) return;
    void onSubmit({ ...form, nameId });
  };

  const previewSrc = getItemImageSrcFromDb(form.image);
  const canSubmit =
    form.nameId.trim() &&
    form.image.trim().replace(/\\/g, '/').startsWith(ITEM_LINK_PREFIX);

  if (!open) return null;

  const content = (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      variants={fadeInOverlay}
      initial="hidden"
      animate="visible"
    >
      <div className="absolute inset-0 bg-black/50" onClick={onClose} aria-hidden />
      <motion.div
        className="relative z-10 w-full max-w-md rounded-xl bg-card shadow-2xl border border-border overflow-hidden max-h-[90vh] flex flex-col"
        variants={scaleInModal}
        initial="hidden"
        animate="visible"
      >
        <div className="p-4 flex items-center justify-between gap-4 bg-gradient-to-r from-emerald-600 to-teal-600 shrink-0">
          <div className="flex items-center gap-2 text-white">
            <FontAwesomeIcon icon={faPlus} className="w-5 h-5" />
            <h2 className="text-xl font-semibold">Thêm item mới</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-white hover:bg-white/20 transition-colors text-2xl font-light leading-none"
            aria-label="Close"
          >
            ×
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
          {error && (
            <div className="rounded-lg bg-destructive/10 text-destructive px-3 py-2 text-sm">{error}</div>
          )}
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">
              NameId <span className="text-destructive">*</span>
            </label>
            <input
              type="text"
              value={form.nameId}
              onChange={(e) => setForm((p) => ({ ...p, nameId: e.target.value }))}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              placeholder="vd: my_item_key"
              autoComplete="off"
              required
            />
          </div>

          <div>
            <span className="block text-sm font-medium text-muted-foreground mb-1">
              Ảnh <span className="text-destructive">*</span>
              <span className="text-xs font-normal text-muted-foreground"> (link đầy đủ /assets/images/...)</span>
            </span>
            <div className="flex gap-3 items-start">
              <div
                className="w-28 h-28 rounded-lg overflow-hidden bg-muted border border-border shrink-0 relative cursor-pointer"
                onClick={() => !imageTreeOpen && openImageTree()}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if ((e.key === 'Enter' || e.key === ' ') && !imageTreeOpen) {
                    e.preventDefault();
                    void openImageTree();
                  }
                }}
              >
                {imageTreeOpen ? (
                  <div className="absolute inset-0 flex flex-col overflow-hidden">
                    <div className="flex items-center justify-between px-1.5 py-0.5 bg-muted border-b border-border text-[10px] shrink-0">
                      <span>Chọn</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setImageTreeOpen(false);
                        }}
                        className="px-1 rounded hover:bg-muted-foreground/20"
                      >
                        Đóng
                      </button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-1 text-[10px]">
                      {imageTreeLoading ? (
                        <p className="text-muted-foreground">Đang tải...</p>
                      ) : imageTree && imageTree.length > 0 ? (
                        imageTree.map((node) => (
                          <FileTreeNode
                            key={node.path}
                            item={node}
                            expanded={imageTreeExpanded}
                            onToggle={toggleImageTreeExpanded}
                            onSelect={selectImage}
                          />
                        ))
                      ) : (
                        <p className="text-muted-foreground">Không có ảnh</p>
                      )}
                    </div>
                  </div>
                ) : previewSrc ? (
                  <img src={previewSrc} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground p-1">
                    <FontAwesomeIcon icon={faImage} className="w-8 h-8 opacity-40" />
                    <span className="text-[9px] text-center mt-1">Chọn ảnh</span>
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0 space-y-1">
                <Button type="button" variant="outline" size="sm" onClick={() => void openImageTree()}>
                  Mở cây thư mục
                </Button>
                <p className="text-[10px] text-muted-foreground break-all font-mono">
                  {form.image || '—'}
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">Base power</label>
              <input
                type="number"
                min={0}
                max={50}
                step={1}
                value={form.basePower}
                onChange={(e) =>
                  setForm((p) => ({
                    ...p,
                    basePower: Math.max(0, Math.min(50, Number(e.target.value) || 0)),
                  }))
                }
                onKeyDown={onlyPositiveInt}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">Base cooldown</label>
              <input
                type="number"
                min={0}
                max={50}
                step={1}
                value={form.baseCooldown}
                onChange={(e) =>
                  setForm((p) => ({
                    ...p,
                    baseCooldown: Math.max(0, Math.min(50, Number(e.target.value) || 0)),
                  }))
                }
                onKeyDown={onlyPositiveInt}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">Max level</label>
            <input
              type="number"
              min={1}
              max={99}
              step={1}
              value={form.maxLevel}
              onChange={(e) =>
                setForm((p) => ({
                  ...p,
                  maxLevel: Math.max(1, Math.min(99, Number(e.target.value) || 1)),
                }))
              }
              onKeyDown={onlyPositiveInt}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">Unlock price</label>
            <input
              type="number"
              min={0}
              step={1}
              value={form.unlockPrice}
              onChange={(e) =>
                setForm((p) => ({
                  ...p,
                  unlockPrice: Math.max(0, Math.floor(Number(e.target.value) || 0)),
                }))
              }
              onKeyDown={onlyPositiveInt}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Hủy
            </Button>
            <Button type="submit" disabled={loading || !canSubmit}>
              {loading ? 'Creating…' : 'Create item'}
            </Button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );

  return createPortal(content, document.body);
}
