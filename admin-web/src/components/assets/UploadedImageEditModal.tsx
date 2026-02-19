import { useState } from 'react';
import { createPortal } from 'react-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { filesService } from '../../services/filesService';

const SUPPORTED_EXT = /\.(png|jpg|jpeg|gif|webp|bmp|tiff|tif)$/i;
// Tỉ lệ mặc định 420×720
const RESIZE_PRESETS = [
  { w: 105, h: 180 },
  { w: 210, h: 360 },
  { w: 420, h: 720 },
  { w: 840, h: 1440 },
];

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

  const canConvertWebp = SUPPORTED_EXT.test(fileName);
  const isWebp = /\.webp$/i.test(fileName);

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

  const modal = (
    <div
      className="fixed inset-0 top-0 left-0 right-0 bottom-0 min-h-screen min-w-screen w-full h-full z-[9999] flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <Card
        className="w-full max-w-lg max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Chi tiết ảnh - Uploaded</CardTitle>
          <Button type="button" variant="ghost" size="sm" onClick={onClose}>
            ✕
          </Button>
        </CardHeader>
        <CardContent className="space-y-5">
          <div>
            <img
              src={filePath}
              alt={fileName}
              className="max-w-full rounded-lg border object-contain max-h-48 bg-muted"
            />
            <p className="mt-2 text-xs text-muted-foreground break-all">{fileName}</p>
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
                Chất lượng {webpQuality} (70–100). Hỗ trợ: png, jpg, jpeg, gif, webp, bmp, tiff
              </p>
              <div className="flex items-center gap-3">
                <div className="flex-1 rounded-lg bg-muted px-2 py-2">
                  <input
                    type="range"
                    min={70}
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
              <h4 className="text-sm font-medium">Resize (tỉ lệ 420×720)</h4>
              <p className="text-xs text-muted-foreground">
                Tạo ảnh mới: <code>tên_ảnh-WxH</code> (fit cover, crop nếu cần)
              </p>
              <div className="flex flex-wrap gap-2">
                {RESIZE_PRESETS.map(({ w, h }) => {
                  const key = `${w}x${h}`;
                  return (
                    <Button
                      key={key}
                      variant="outline"
                      size="sm"
                      onClick={() => handleResize(w, h)}
                      disabled={resizeLoading !== null}
                    >
                      {resizeLoading === key ? '...' : `${w}×${h}`}
                    </Button>
                  );
                })}
              </div>
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

          {deleteConfirmOpen && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 space-y-2">
              <p className="text-sm font-medium text-amber-800">Bạn có chắc muốn xóa file này?</p>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={handleDeleteConfirm}
                  disabled={editSaving}
                >
                  Có, xóa
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={() => setDeleteConfirmOpen(false)}>
                  Không
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );

  return createPortal(modal, document.body);
}
