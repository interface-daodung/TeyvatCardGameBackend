import { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { filesService } from '../../services/filesService';
import { scaleInModal, fadeInOverlay } from '../animations/motionPresets';

const SUPPORTED_EXT = /\.(png|jpg|jpeg|gif|webp|bmp|tiff|tif)$/i;
function basename(filePath: string): string {
  return filePath.replace(/^.*[/\\]/, '');
}

interface UploadedImageEditModalProps {
  filePath: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function UploadedImageEditModal({ filePath, onClose, onSuccess }: UploadedImageEditModalProps) {
  const fileName = basename(filePath);
  const [editName, setEditName] = useState(fileName);
  const [editSaving, setEditSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  const [webpQuality, setWebpQuality] = useState(85);
  const [webpLoading, setWebpLoading] = useState(false);

  const [resizeLoading, setResizeLoading] = useState<string | null>(null);
  const [sourceSize, setSourceSize] = useState<{ w: number; h: number } | null>(null);
  const [customWidth, setCustomWidth] = useState<number>(420);
  const [customHeight, setCustomHeight] = useState<number>(720);

  const canConvertWebp = SUPPORTED_EXT.test(fileName);
  const isWebp = /\.webp$/i.test(fileName);
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
    return factors.map((f, idx) => ({
      w: Math.max(1, Math.round(sourceSize.w * f)),
      h: Math.max(1, Math.round(sourceSize.h * f)),
      label: `${idx === 0 ? '50%' : `/${Math.pow(2, idx + 1)}`}`,
    }));
  }, [sourceSize]);

  const handleRename = async () => {
    const current = fileName;
    const ext = current.includes('.') ? current.slice(current.lastIndexOf('.')) : '';
    const newName = editName.trim().includes('.') ? editName.trim() : editName.trim() + ext;
    if (newName === current) {
      onClose();
      return;
    }
    setEditSaving(true);
    setError(null);
    try {
      await filesService.renameUploaded(current, newName);
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

  const handleDeleteClick = () => setDeleteConfirmOpen(true);

  const handleDeleteConfirm = async () => {
    setEditSaving(true);
    setError(null);
    try {
      await filesService.deleteUploaded(fileName);
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

  const handleConvertWebp = async () => {
    if (!canConvertWebp) return;
    setWebpLoading(true);
    setError(null);
    try {
      await filesService.convertToWebp(fileName, webpQuality);
      onSuccess();
      setError(null);
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
    const key = `${width}x${height}`;
    setResizeLoading(key);
    setError(null);
    try {
      await filesService.resizeUploaded(fileName, width, height);
      onSuccess();
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

  const modal = (
    <div
      className="fixed inset-0 top-0 left-0 right-0 bottom-0 min-h-screen min-w-screen w-full h-full z-[9999] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        className="absolute inset-0 bg-black/50 cursor-pointer"
        aria-hidden
        variants={fadeInOverlay}
        initial="hidden"
        animate="visible"
        onClick={onClose}
      />
      <motion.div
        variants={scaleInModal}
        initial="hidden"
        animate="visible"
        className="relative z-10 w-full max-w-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <Card className="w-full max-h-[90vh] overflow-y-auto">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Chi tiết ảnh - Uploaded</CardTitle>
            <Button type="button" variant="ghost" size="sm" onClick={onClose}>
              ✕
            </Button>
          </CardHeader>
          <CardContent className="space-y-5">
            <AnimatePresence mode="wait">
              {deleteConfirmOpen ? (
                <motion.div
                  key="confirm-delete-uploaded"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2, ease: 'easeOut' }}
                  layout
                >
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-destructive">
                        Xóa file?
                      </p>
                      <p className="text-xs text-muted-foreground break-all">
                        {fileName}
                      </p>
                    </div>
                    <div className="space-y-2 rounded-lg border border-amber-300/70 bg-amber-950/40 p-3">
                      <p className="text-sm font-medium text-amber-100">
                        Bạn có chắc muốn xóa file này? Hành động này không thể hoàn tác.
                      </p>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          onClick={handleDeleteConfirm}
                          disabled={editSaving}
                        >
                          Có, xóa vĩnh viễn
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setDeleteConfirmOpen(false)}
                          disabled={editSaving}
                        >
                          Hủy, giữ lại file
                        </Button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="edit-uploaded"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2, ease: 'easeOut' }}
                  layout
                >
                  <div>
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
                      className="max-w-full rounded-lg border object-contain max-h-48 bg-muted"
                    />
                    <p className="mt-2 text-xs text-muted-foreground break-all">{fileName}</p>
                    {sourceSize && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        Kích thước gốc: {sourceSize.w}×{sourceSize.h}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="text-sm font-medium">Đổi tên</label>
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                    />
                  </div>

                  {canConvertWebp && (
                    <div className="space-y-3 border-t pt-4">
                      <h4 className="text-sm font-medium">Chuyển đổi WebP (Lossy)</h4>
                      <p className="text-xs text-muted-foreground">
                        Chất lượng {webpQuality} (30–100). Hỗ trợ: png, jpg, jpeg, gif, webp, bmp, tiff
                      </p>
                      <div className="flex items-center gap-3">
                        <div className="flex-1 rounded-lg bg-muted px-2 py-2">
                          <input
                            type="range"
                            min={30}
                            max={100}
                            value={webpQuality}
                            onChange={(e) => setWebpQuality(Number(e.target.value))}
                            className="w-full h-2 rounded-lg appearance-none cursor-pointer accent-primary"
                          />
                        </div>
                        <span className="text-sm font-mono w-8">{webpQuality}</span>
                      </div>
                      <Button
                        onClick={handleConvertWebp}
                        disabled={webpLoading}
                      >
                        {webpLoading ? 'Đang xử lý...' : isWebp ? 'Nén lại WebP' : 'Đổi đuôi thành WebP'}
                      </Button>
                    </div>
                  )}

                  {canConvertWebp && (
                    <div className="space-y-3 border-t pt-4">
                      <h4 className="text-sm font-medium">Resize (mỗi bước giảm 50%)</h4>
                      <p className="text-xs text-muted-foreground">
                        Tạo ảnh mới: <code>tên_ảnh-WxH</code> (fit cover, crop nếu cần)
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {resizePresets.map(({ w, h, label }) => {
                          const key = `${w}x${h}`;
                          return (
                            <Button
                              key={key}
                              variant="outline"
                              size="sm"
                              onClick={() => handleResize(w, h)}
                              disabled={resizeLoading !== null}
                            >
                              {resizeLoading === key ? '...' : `${w}×${h} (${label})`}
                            </Button>
                          );
                        })}
                      </div>
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
                        onClick={handleResizeCustom}
                        disabled={resizeLoading !== null}
                      >
                        {resizeLoading === `${Math.max(1, Math.round(customWidth || 0))}x${Math.max(1, Math.round(customHeight || 0))}`
                          ? '...'
                          : `Cắt theo nhập tay: ${Math.max(1, Math.round(customWidth || 0))}×${Math.max(1, Math.round(customHeight || 0))}`}
                      </Button>
                    </div>
                  )}

                  {error && <p className="text-sm text-red-600">{error}</p>}

                  <div className="flex flex-wrap gap-2 border-t pt-4">
                    <Button onClick={handleRename} disabled={editSaving}>
                      Lưu tên
                    </Button>
                    <Button type="button" variant="outline" onClick={handleDeleteClick} disabled={editSaving}>
                      Xóa file
                    </Button>
                    <Button type="button" variant="ghost" onClick={onClose}>
                      Đóng
                    </Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );

  return createPortal(modal, document.body);
}
