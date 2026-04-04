import { useCallback, useEffect, useLayoutEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faGear, faSpinner, faTrash } from '@fortawesome/free-solid-svg-icons';
import { Button } from '../ui/button';
import { ImageLightbox, type ImageLightboxOpen } from '../ui/ImageLightbox';
import { filesService, STICKY_BAR_CONVERT_WEBP_QUALITY, type StagedPreviewInfo } from '../../services/filesService';

const SUPPORTED_EXT = /\.(png|jpg|jpeg|gif|webp|bmp|tiff|tif)$/i;
const FILE_NAME_REGEX = /^[a-zA-Z0-9._-]+$/;

function basename(filePath: string): string {
  return filePath.replace(/^.*[/\\]/, '');
}

function clampQuality(q: number): number {
  return Math.max(10, Math.min(100, Math.round(q)));
}

/** Khóa trùng lặp — khớp clamp phía server (1–4096 px, q 10–100). */
function makeConvertLossyDedupeKey(quality: number): string {
  return `convert:q${clampQuality(quality)}`;
}

function makeResizeDedupeKey(w: number, h: number, lossy: boolean, quality?: number): string {
  const W = Math.max(1, Math.min(4096, Math.round(w)));
  const H = Math.max(1, Math.min(4096, Math.round(h)));
  if (!lossy) return `resize:${W}x${H}:raw`;
  return `resize:${W}x${H}:q${clampQuality(quality ?? 85)}`;
}

function tagLineForConvert(quality: number): string {
  return `WebP q${clampQuality(quality)}`;
}

function tagLineForResize(w: number, h: number, lossy: boolean, quality?: number): string {
  const W = Math.max(1, Math.min(4096, Math.round(w)));
  const H = Math.max(1, Math.min(4096, Math.round(h)));
  if (!lossy) return `${W}×${H} · giữ định dạng`;
  return `${W}×${H} · q${clampQuality(quality ?? 85)}`;
}

const DUPLICATE_PREVIEW_MSG =
  'Đã có preview trùng thiết lập trong danh sách chờ duyệt — xóa bản cũ trước nếu muốn tạo lại.';

export type ImageEditModalProps = {
  filePath: string;
  onClose: () => void;
  onSuccess: () => void;
  /** Gắn handler đóng modal (overlay / ✕): có preview chưa lưu thì hỏi trước. */
  registerCloseAttempt?: (fn: () => void) => void;
};

export function ImageEditModal({ filePath, onClose, onSuccess, registerCloseAttempt }: ImageEditModalProps) {
  const fileName = basename(filePath);
  const normalizedPath = filePath.replace(/\\/g, '/');
  const isAssetsImageSource = normalizedPath.startsWith('/assets/images/');

  const [editName, setEditName] = useState(fileName);
  const [editSaving, setEditSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  const [lossyEnabled, setLossyEnabled] = useState(true);
  const [webpQuality, setWebpQuality] = useState(80);
  const [webpLoading, setWebpLoading] = useState(false);

  const [resizeLoading, setResizeLoading] = useState<string | null>(null);
  const [sourceSize, setSourceSize] = useState<{ w: number; h: number } | null>(null);
  const [sourceFileSizeBytes, setSourceFileSizeBytes] = useState<number | null>(null);

  const [customWidth, setCustomWidth] = useState<number>(420);
  const [customHeight, setCustomHeight] = useState<number>(720);
  const [resizeManualMode, setResizeManualMode] = useState(false);

  type PendingPreviewInfo = StagedPreviewInfo & {
    dedupeKey: string;
    tagLine: string;
    meta?: { width?: number; height?: number; sizeBytes?: number };
  };

  const [pendingPreviews, setPendingPreviews] = useState<PendingPreviewInfo[]>([]);

  const pendingDedupeKeys = useMemo(
    () => new Set(pendingPreviews.map((p) => p.dedupeKey)),
    [pendingPreviews]
  );

  const convertCurrentWouldDuplicate = pendingDedupeKeys.has(makeConvertLossyDedupeKey(webpQuality));

  const stickyBarConvertWouldDuplicate = pendingDedupeKeys.has(
    makeConvertLossyDedupeKey(STICKY_BAR_CONVERT_WEBP_QUALITY)
  );

  const resizeWouldDuplicate = (w: number, h: number) =>
    pendingDedupeKeys.has(
      makeResizeDedupeKey(w, h, lossyEnabled, lossyEnabled ? webpQuality : undefined)
    );
  const [commitLoading, setCommitLoading] = useState<string | null>(null);

  const [lightboxOpen, setLightboxOpen] = useState<ImageLightboxOpen | null>(null);

  const [unsavedCloseConfirmOpen, setUnsavedCloseConfirmOpen] = useState(false);
  const [discardAllLoading, setDiscardAllLoading] = useState(false);

  const canConvertWebp = SUPPORTED_EXT.test(fileName);
  const isWebp = /\.webp$/i.test(fileName);

  const formatSize = (size?: number) => {
    if (typeof size !== 'number' || Number.isNaN(size)) return '—';
    if (size < 1024) return `${size} B`;
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
    if (size < 1024 * 1024 * 1024) return `${(size / 1024 / 1024).toFixed(1)} MB`;
    return `${(size / 1024 / 1024 / 1024).toFixed(1)} GB`;
  };

  useEffect(() => {
    let cancelled = false;
    setSourceFileSizeBytes(null);
    void (async () => {
      try {
        const meta = await filesService.getFileMetadata(filePath);
        if (cancelled) return;
        if ('file' in meta && meta.file?.size !== undefined) {
          setSourceFileSizeBytes(meta.file.size);
        }
      } catch {
        // Size is optional; ignore failures.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [filePath]);

  useEffect(() => {
    setEditName(basename(filePath));
    setPendingPreviews([]);
    setLightboxOpen(null);
    setError(null);
    setDeleteConfirmOpen(false);
    setSourceSize(null);
  }, [filePath]);

  const hydratePreview = async (preview: StagedPreviewInfo) => {
    try {
      const meta = await filesService.getFileMetadata(preview.previewUrl);
      const imgAny = meta.image as any;
      const width = typeof imgAny?.width === 'number' ? imgAny.width : undefined;
      const height = typeof imgAny?.height === 'number' ? imgAny.height : undefined;
      const sizeBytes = meta.file?.size;
      setPendingPreviews((prev) =>
        prev.map((p) =>
          p.stagedFilename === preview.stagedFilename
            ? {
                ...p,
                meta: {
                  width,
                  height,
                  sizeBytes,
                },
              }
            : p
        )
      );
    } catch {
      // preview meta is optional; ignore failure
    }
  };

  const resizePresets = useMemo(() => {
    if (!sourceSize || sourceSize.w <= 0 || sourceSize.h <= 0) {
      return [
        { w: 420, h: 720, label: 'Mặc định' },
        { w: 210, h: 360, label: '50%' },
        { w: 105, h: 180, label: '25%' },
        { w: 840, h: 1440, label: '200%' },
      ];
    }
    const factors = [0.5, 0.25, 0.125, 0.0625];
    return factors.map((f) => {
      const percent = f * 100;
      const percentStr =
        percent % 1 === 0
          ? `${percent.toFixed(0)}%`
          : `${percent.toFixed(2).replace(/0+$/, '').replace(/\.$/, '')}%`;

      return {
        w: Math.max(1, Math.round(sourceSize.w * f)),
        h: Math.max(1, Math.round(sourceSize.h * f)),
        label: percentStr,
      };
    });
  }, [sourceSize]);

  const normalizedRenameTarget = useMemo(() => {
    const current = fileName;
    const ext = current.includes('.') ? current.slice(current.lastIndexOf('.')) : '';
    const trimmed = editName.trim();
    if (!trimmed) return null;
    const candidate = trimmed.includes('.') ? trimmed : `${trimmed}${ext}`;
    return FILE_NAME_REGEX.test(candidate) ? candidate : null;
  }, [editName, fileName]);

  const renameNameError =
    editName.trim().length > 0 && !normalizedRenameTarget
      ? 'Tên file chỉ được chứa chữ, số, dấu chấm, gạch ngang, gạch dưới.'
      : null;

  const handleRename = async () => {
    const current = fileName;
    const newName = normalizedRenameTarget;
    if (!newName) {
      setError('Tên file mới không hợp lệ');
      return;
    }
    if (newName === current) {
      onClose();
      return;
    }

    setEditSaving(true);
    setError(null);
    try {
      if (isAssetsImageSource) {
        await filesService.renameAssetsFile(filePath, newName);
      } else {
        await filesService.renameUploaded(current, newName, filePath);
      }
      onSuccess();
      onClose();
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { error?: string } } }).response?.data?.error
          : 'Đổi tên thất bại';
      setError(msg || 'Đổi tên thất bại');
    } finally {
      setEditSaving(false);
    }
  };

  const handleDeleteConfirm = async () => {
    setEditSaving(true);
    setError(null);
    try {
      if (isAssetsImageSource) {
        await filesService.deleteAssetsImage(filePath);
      } else {
        await filesService.deleteUploaded(fileName);
      }
      onSuccess();
      onClose();
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { error?: string } } }).response?.data?.error
          : 'Xóa file thất bại';
      setError(msg || 'Xóa file thất bại');
    } finally {
      setEditSaving(false);
      setDeleteConfirmOpen(false);
    }
  };

  const handleConvertWebp = async (qualityOverride?: number) => {
    if (!canConvertWebp) return;
    const q = typeof qualityOverride === 'number' ? qualityOverride : webpQuality;
    const dedupeKey = makeConvertLossyDedupeKey(q);
    if (pendingDedupeKeys.has(dedupeKey)) {
      setError(DUPLICATE_PREVIEW_MSG);
      return;
    }
    setWebpLoading(true);
    setError(null);
    try {
      const preview = await filesService.stageConvertToWebpLossy(fileName, q, filePath);
      const tagLine = tagLineForConvert(q);
      setPendingPreviews((prev) => [...prev, { ...preview, dedupeKey, tagLine }]);
      void hydratePreview(preview);
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { error?: string } } }).response?.data?.error
          : 'Chuyển webp thất bại';
      setError(msg || 'Chuyển webp thất bại');
    } finally {
      setWebpLoading(false);
    }
  };

  const handleResize = async (width: number, height: number) => {
    const dedupeKey = makeResizeDedupeKey(width, height, lossyEnabled, lossyEnabled ? webpQuality : undefined);
    if (pendingDedupeKeys.has(dedupeKey)) {
      setError(DUPLICATE_PREVIEW_MSG);
      return;
    }
    const key = `${width}x${height}`;
    setResizeLoading(key);
    setError(null);
    try {
      const preview = lossyEnabled
        ? await filesService.stageResizeUploadedToWebpLossy(fileName, width, height, webpQuality, filePath)
        : await filesService.stageResizeUploaded(fileName, width, height, filePath);
      const tagLine = tagLineForResize(width, height, lossyEnabled, lossyEnabled ? webpQuality : undefined);
      setPendingPreviews((prev) => [...prev, { ...preview, dedupeKey, tagLine }]);
      void hydratePreview(preview);
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { error?: string } } }).response?.data?.error
          : 'Resize thất bại';
      setError(msg || 'Resize thất bại');
    } finally {
      setResizeLoading(null);
    }
  };

  const handleResizeCustom = async () => {
    const w = Math.max(1, Math.round(customWidth || 0));
    const h = Math.max(1, Math.round(customHeight || 0));
    await handleResize(w, h);
  };

  const handleCommitPreview = async (preview: StagedPreviewInfo) => {
    if (commitLoading) return;
    setCommitLoading(preview.stagedFilename);
    setError(null);
    try {
      await filesService.commitStagedPreview({
        kind: preview.kind,
        stagedFilename: preview.stagedFilename,
        targetFilename: preview.targetFilename,
      });

      setPendingPreviews((prev) => prev.filter((p) => p.stagedFilename !== preview.stagedFilename));
      onSuccess();
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { error?: string } } }).response?.data?.error
          : 'Lưu preview thất bại';
      setError(msg || 'Lưu preview thất bại');
    } finally {
      setCommitLoading(null);
    }
  };

  const handleDiscardPreview = async (preview: StagedPreviewInfo) => {
    setError(null);
    try {
      await filesService.deleteStagedPreview({
        kind: preview.kind,
        stagedFilename: preview.stagedFilename,
      });
      setPendingPreviews((prev) => prev.filter((p) => p.stagedFilename !== preview.stagedFilename));
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { error?: string } } }).response?.data?.error
          : 'Xóa preview thất bại';
      setError(msg || 'Xóa preview thất bại');
    }
  };

  const discardAllPendingAndClose = async () => {
    if (pendingPreviews.length === 0) {
      setUnsavedCloseConfirmOpen(false);
      onClose();
      return;
    }
    setDiscardAllLoading(true);
    setError(null);
    try {
      const list = [...pendingPreviews];
      for (const p of list) {
        await filesService.deleteStagedPreview({
          kind: p.kind,
          stagedFilename: p.stagedFilename,
        });
      }
      setPendingPreviews([]);
      setUnsavedCloseConfirmOpen(false);
      onClose();
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { error?: string } } }).response?.data?.error
          : 'Huỷ preview thất bại';
      setError(msg || 'Huỷ preview thất bại');
    } finally {
      setDiscardAllLoading(false);
    }
  };

  const requestClose = useCallback(() => {
    if (deleteConfirmOpen) {
      setDeleteConfirmOpen(false);
      return;
    }
    if (unsavedCloseConfirmOpen) {
      setUnsavedCloseConfirmOpen(false);
      return;
    }
    if (pendingPreviews.length > 0) {
      setUnsavedCloseConfirmOpen(true);
      return;
    }
    onClose();
  }, [deleteConfirmOpen, unsavedCloseConfirmOpen, pendingPreviews.length, onClose]);

  useLayoutEffect(() => {
    registerCloseAttempt?.(requestClose);
    return () => registerCloseAttempt?.(() => {});
  }, [registerCloseAttempt, requestClose]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      requestClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [requestClose]);

  const unsavedConfirmDialog =
    unsavedCloseConfirmOpen &&
    typeof document !== 'undefined' &&
    createPortal(
      <div
        className="fixed inset-0 z-[100000] flex items-center justify-center bg-black/55 p-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby="unsaved-close-title"
        onClick={() => setUnsavedCloseConfirmOpen(false)}
      >
        <div
          className="w-full max-w-md rounded-lg border bg-background p-4 shadow-lg"
          onClick={(e) => e.stopPropagation()}
        >
          <p id="unsaved-close-title" className="text-sm font-medium">
            Còn ảnh chờ duyệt chưa lưu
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Bạn có muốn tiếp tục lưu các preview này không? Nếu đóng modal, có thể huỷ preview tạm trên server.
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            ({pendingPreviews.length} ảnh chờ duyệt)
          </p>
          <div className="mt-4 flex flex-wrap gap-2 justify-end">
            <Button
              type="button"
              variant="default"
              size="sm"
              disabled={discardAllLoading}
              onClick={() => setUnsavedCloseConfirmOpen(false)}
            >
              Ở lại
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={discardAllLoading}
              onClick={() => void discardAllPendingAndClose()}
            >
              {discardAllLoading ? 'Đang huỷ...' : 'Huỷ hết'}
            </Button>
          </div>
        </div>
      </div>,
      document.body
    );

  return (
    <div className="space-y-5 pb-24">
      {error && <p className="text-sm text-red-600">{error}</p>}

      <AnimatePresence mode="wait">
        {deleteConfirmOpen ? (
          <motion.div
            key="confirm-delete"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
          >
            <div className="space-y-3 rounded-lg border border-amber-300/70 bg-amber-950/40 p-4">
              <div className="space-y-1">
                <p className="text-sm font-medium text-destructive">Xóa file?</p>
                <p className="text-xs text-muted-foreground break-all">{fileName}</p>
              </div>
              <p className="text-sm font-medium text-amber-100">Hành động này không thể hoàn tác.</p>
              <div className="flex gap-2">
                <Button type="button" variant="destructive" size="sm" onClick={handleDeleteConfirm} disabled={editSaving}>
                  Có, xóa vĩnh viễn
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setDeleteConfirmOpen(false)}
                  disabled={editSaving}
                >
                  Hủy
                </Button>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="edit-content"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
          >
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:items-start">
              {/* LEFT */}
              <div className="space-y-4">
                  <div className="space-y-2 rounded-lg border bg-muted/30 p-3">
                    <div className="space-y-3">
                      <img
                        src={filePath}
                        alt={fileName}
                        onLoad={(e) => {
                          const img = e.currentTarget;
                          if (img.naturalWidth > 0 && img.naturalHeight > 0) {
                            setSourceSize({ w: img.naturalWidth, h: img.naturalHeight });
                            setCustomWidth(img.naturalWidth);
                            setCustomHeight(img.naturalHeight);
                          }
                        }}
                        className="max-w-full w-full rounded-lg border object-contain max-h-48 bg-muted"
                      />
                      <p className="text-xs text-muted-foreground break-all">{fileName}</p>
                      <p className="text-xs text-muted-foreground">
                        Kích thước gốc: {sourceSize ? `${sourceSize.w}×${sourceSize.h}` : '—'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Dung lượng file: {sourceFileSizeBytes !== null ? formatSize(sourceFileSizeBytes) : '—'}
                      </p>
                    </div>

                    <div className="pt-2">
                      <p className="text-sm font-medium">Đổi tên</p>
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key !== 'Enter') return;
                          if (e.shiftKey) return;
                          e.preventDefault();
                          void handleRename();
                        }}
                        disabled={editSaving}
                        className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                      />
                    </div>
                    {renameNameError && !error && <p className="text-sm text-red-600">{renameNameError}</p>}
                    {!renameNameError && !editSaving && (
                      <p className="text-[11px] text-muted-foreground">Nhấn Enter để lưu</p>
                    )}
                  </div>

                </div>

                <div className="space-y-4">
                {canConvertWebp && (
                  <div className="space-y-3 rounded-lg border bg-muted/30 p-3">
                    <h4 className="text-sm font-medium">Nén Lossy (WebP)</h4>

                    <div className="flex items-center justify-between gap-3">
                      <span className="text-xs text-muted-foreground">Kích hoạt nén mất dữ liệu</span>
                      <label className="relative inline-flex cursor-pointer items-center">
                        <input
                          type="checkbox"
                          checked={lossyEnabled}
                          onChange={(e) => setLossyEnabled(e.target.checked)}
                          className="peer sr-only"
                        />
                        <span className="h-5 w-10 rounded-full border border-border bg-muted transition-colors peer-checked:border-primary peer-checked:bg-primary/15" />
                        <span className="absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-muted-foreground/35 transition-transform peer-checked:translate-x-5 peer-checked:bg-primary" />
                      </label>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center gap-3">
                        <label className="text-xs text-muted-foreground whitespace-nowrap">Chất lượng</label>
                        <div className="flex min-w-0 flex-1 items-center gap-2">
                          <input
                            type="range"
                            min={10}
                            max={100}
                            value={webpQuality}
                            disabled={!lossyEnabled}
                            onChange={(e) => setWebpQuality(Number(e.target.value))}
                            className="min-w-0 flex-1 h-2 rounded-lg border border-border/60 bg-muted/20 appearance-none cursor-pointer accent-primary disabled:cursor-not-allowed disabled:opacity-60"
                          />
                          <span className="text-xs font-mono w-12 shrink-0 text-center text-primary">{webpQuality}</span>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="h-8 w-8 shrink-0"
                          onClick={() => void handleConvertWebp()}
                          disabled={!lossyEnabled || webpLoading || convertCurrentWouldDuplicate}
                          title={
                            convertCurrentWouldDuplicate
                              ? 'Đã có preview cùng chất lượng trong chờ duyệt'
                              : isWebp
                                ? 'Nén lại WebP'
                                : 'Đổi đuôi thành WebP'
                          }
                          aria-label={isWebp ? 'Nén lại WebP' : 'Đổi đuôi thành WebP'}
                        >
                          {webpLoading ? (
                            <FontAwesomeIcon icon={faSpinner} className="h-4 w-4 animate-spin" />
                          ) : (
                            <FontAwesomeIcon icon={faGear} className="h-4 w-4" />
                          )}
                        </Button>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {[95, 80, 65, 50, 30].map((q) => {
                          const dupQ = pendingDedupeKeys.has(makeConvertLossyDedupeKey(q));
                          return (
                            <Button
                              key={q}
                              type="button"
                              variant={webpQuality === q ? 'default' : 'outline'}
                              size="sm"
                              onClick={(e) => {
                                setWebpQuality(q);
                                if (e.shiftKey) {
                                  void handleConvertWebp(q);
                                }
                              }}
                              disabled={!lossyEnabled || webpLoading}
                              title={
                                dupQ
                                  ? 'Đã có preview WebP cùng q trong chờ duyệt (Shift+click sẽ báo trùng)'
                                  : 'Shift+click: tạo preview lossy ngay'
                              }
                              className="h-8"
                            >
                              {q}
                            </Button>
                          );
                        })}
                      </div>

                      <p className="text-[11px] text-muted-foreground">
                        Khi bật, thao tác <span className="font-medium text-foreground">Resize</span> sẽ được nén WebP (Lossy).
                      </p>
                    </div>
                  </div>
                )}

                {canConvertWebp && (
                  <div className="space-y-3 rounded-lg border bg-muted/30 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="text-sm font-medium">Resize</h4>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs"
                        onClick={() => setResizeManualMode((prev) => !prev)}
                      >
                        {resizeManualMode ? 'Quick links' : 'Nhập tay'}
                      </Button>
                    </div>

                    {!resizeManualMode && (
                      <div className="flex flex-wrap gap-2">
                        {resizePresets.map(({ w, h, label }) => {
                          const key = `${w}x${h}`;
                          const isLoading = resizeLoading === key;
                          const dupResize = resizeWouldDuplicate(w, h);
                          return (
                            <button
                              key={key}
                              type="button"
                              onClick={() => void handleResize(w, h)}
                              disabled={resizeLoading !== null || dupResize}
                              className="group relative px-4 py-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-sm font-medium rounded-lg shadow-md transition-all duration-200 ease-in-out cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-gray-400 disabled:hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                              title={
                                dupResize
                                  ? 'Đã có preview cùng kích thước & lossy trong chờ duyệt'
                                  : `Resize: ${label}`
                              }
                            >
                              <div className="relative inline-block">
                                <span className="px-2 py-1">{isLoading ? '...' : `${w}×${h}`}</span>

                                <span className="absolute -top-3 -right-6 text-xs px-1.5 py-0.5 rounded-full bg-amber-500 text-white font-semibold shadow-sm group-hover:bg-amber-600 transition-colors">
                                  {label}
                                </span>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {resizeManualMode && (
                      <>
                        <div className="grid grid-cols-2 gap-2">
                          <label className="text-xs text-muted-foreground">
                            W (px)
                            <input
                              type="number"
                              min={1}
                              value={customWidth}
                              onChange={(e) => setCustomWidth(Number(e.target.value))}
                              className="mt-1 block w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
                            />
                          </label>
                          <label className="text-xs text-muted-foreground">
                            H (px)
                            <input
                              type="number"
                              min={1}
                              value={customHeight}
                              onChange={(e) => setCustomHeight(Number(e.target.value))}
                              className="mt-1 block w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
                            />
                          </label>
                        </div>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => void handleResizeCustom()}
                          disabled={
                            resizeLoading !== null ||
                            resizeWouldDuplicate(
                              Math.max(1, Math.round(customWidth || 0)),
                              Math.max(1, Math.round(customHeight || 0))
                            )
                          }
                          title={
                            resizeWouldDuplicate(
                              Math.max(1, Math.round(customWidth || 0)),
                              Math.max(1, Math.round(customHeight || 0))
                            )
                              ? 'Đã có preview cùng kích thước & lossy trong chờ duyệt'
                              : undefined
                          }
                        >
                          {resizeLoading === `${Math.max(1, Math.round(customWidth || 0))}x${Math.max(1, Math.round(customHeight || 0))}`
                            ? '...'
                            : `Cắt theo nhập tay: ${Math.max(1, Math.round(customWidth || 0))}×${Math.max(1, Math.round(customHeight || 0))}`}
                        </Button>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* PREVIEW PANEL */}
            <div className="rounded-lg border bg-muted/30 p-4">
              <div className="flex items-baseline justify-between gap-2 mb-3">
                <h4 className="text-sm font-medium">Ảnh chờ duyệt</h4>
                <p className="text-xs text-muted-foreground">({pendingPreviews.length} ảnh)</p>
              </div>

              {pendingPreviews.length === 0 ? (
                <div className="py-8 text-center text-xs text-muted-foreground">
                  Chưa có ảnh nào. Bấm <span className="font-medium text-foreground">Chuyển WebP</span> hoặc{' '}
                  <span className="font-medium text-foreground">Resize</span> để tạo preview tạm (tmp); bấm{' '}
                  <span className="font-medium text-foreground">Lưu</span> trên từng ảnh để ghi vào{' '}
                  <span className="font-medium text-foreground">uploads/lossy</span> hoặc{' '}
                  <span className="font-medium text-foreground">uploads/resize</span>. File mới dưới thư mục gốc{' '}
                  <span className="font-medium text-foreground">uploads/</span> thêm từ trang quản lý asset (upload).
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 mt-1">
                  {pendingPreviews.map((p) => (
                    <div
                      key={p.stagedFilename}
                      className="min-w-0 space-y-2 rounded-lg border bg-muted/20 p-2"
                    >
                      <div
                        className="relative rounded-md overflow-hidden border bg-muted cursor-zoom-in"
                        onClick={() =>
                          setLightboxOpen({
                            src: p.previewUrl,
                            alt: p.targetFilename,
                          })
                        }
                      >
                        <img
                          src={p.previewUrl}
                          alt={p.targetFilename}
                          className="h-28 w-full object-contain bg-muted"
                        />
                        <div className="absolute top-2 left-2 right-8 flex flex-wrap gap-1">
                          <span
                            className="max-w-full rounded-sm bg-slate-900/85 px-2 py-0.5 text-[10px] font-medium leading-tight text-white shadow-sm"
                            title={p.dedupeKey}
                          >
                            {p.tagLine}
                          </span>
                        </div>
                        <div className="absolute bottom-2 left-2 rounded-sm bg-amber-600/90 px-2 py-0.5 text-[10px] font-medium text-white">
                          chờ duyệt
                        </div>
                      </div>

                      <p className="text-[10px] font-mono text-muted-foreground/90 break-all" title="Khóa trùng lặp (frontend)">
                        {p.dedupeKey}
                      </p>
                      <p className="text-[11px] font-mono text-muted-foreground break-all">{p.kind}</p>
                      <p className="text-[11px] font-mono break-all">{p.targetFilename}</p>
                      {p.meta?.width && p.meta?.height && (
                        <p className="text-[11px] text-muted-foreground">
                          Kích thước: {p.meta.width}×{p.meta.height}px
                        </p>
                      )}
                      {typeof p.meta?.sizeBytes === 'number' && (
                        <p className="text-[11px] text-muted-foreground">Dung lượng: {formatSize(p.meta.sizeBytes)}</p>
                      )}

                      <div className="flex gap-2">
                        <Button
                          type="button"
                          size="sm"
                          className="flex-1"
                          onClick={() => void handleCommitPreview(p)}
                          disabled={commitLoading === p.stagedFilename}
                        >
                          {commitLoading === p.stagedFilename ? 'Đang lưu...' : 'Lưu'}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => void handleDiscardPreview(p)}
                          disabled={commitLoading !== null}
                          title="Xóa preview tmp"
                        >
                          ✕
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <ImageLightbox
              open={lightboxOpen}
              onClose={() => setLightboxOpen(null)}
              className="z-[100000]"
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ACTION BAR */}
      {!deleteConfirmOpen && (
        <div className="sticky bottom-0 -mx-5 px-5 py-3 bg-background/90 backdrop-blur border-t z-[100] flex items-center justify-between gap-2">
          <Button
            type="button"
            variant="destructive"
            size="icon"
            className="h-9 w-9 shrink-0"
            onClick={() => setDeleteConfirmOpen(true)}
            disabled={editSaving}
            title="Xóa file"
            aria-label="Xóa file"
          >
            <FontAwesomeIcon icon={faTrash} className="h-4 w-4" />
          </Button>
          {canConvertWebp && !isWebp && (
            <Button
              type="button"
              size="sm"
              className="h-9 shrink-0"
              onClick={() => void handleConvertWebp(STICKY_BAR_CONVERT_WEBP_QUALITY)}
              disabled={!lossyEnabled || webpLoading || stickyBarConvertWouldDuplicate}
              title={
                stickyBarConvertWouldDuplicate
                  ? 'A preview at this quality is already in the queue'
                  : `Lossy WebP preview at quality ${STICKY_BAR_CONVERT_WEBP_QUALITY} (max)`
              }
              aria-label="Convert to WebP"
            >
              Convert to WebP
            </Button>
          )}
        </div>
      )}
      {unsavedConfirmDialog}
    </div>
  );
}

/** Alias — một số bản build/HMR cũ import tên này; dùng const để Vite resolve ổn định. */
export const UploadedImageEditModalBody = ImageEditModal;
