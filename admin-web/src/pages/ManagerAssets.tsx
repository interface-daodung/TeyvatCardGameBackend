import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { PageHeader } from '../components/PageHeader';
import { FileTreeNode } from '../components/FileTreeNode';
import { fadeSlideCard } from '../components/animations/motionPresets';
import { UploadedImageEditModal } from '../components/assets/UploadedImageEditModal';
import { AtlasBuilderModal } from '../components/assets/AtlasBuilderModal';
import { filesService, type FileTreeItem, type FileMetadata, type FullImageMetadata } from '../services/filesService';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';

function buildCombinedTree(cardsTree: FileTreeItem[], uploadedTree: FileTreeItem[]): FileTreeItem {
  return {
    name: 'assets',
    path: '',
    type: 'dir',
    children: [
      { name: 'images', path: '/assets/images', type: 'dir', children: cardsTree },
      { name: 'uploaded', path: '/uploads', type: 'dir', children: uploadedTree },
    ],
  };
}

function basename(filePath: string): string {
  return filePath.replace(/^.*[/\\]/, '');
}

function dirname(filePath: string): string {
  const i = filePath.replace(/\\/g, '/').lastIndexOf('/');
  return i <= 0 ? filePath : filePath.slice(0, i);
}

export default function ManagerAssets() {
  const ANIMATION_FRAME_SIZE = 192;

  const [combinedTree, setCombinedTree] = useState<FileTreeItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [pendingUpload, setPendingUpload] = useState<File | null>(null);
  const [pendingUploadUrl, setPendingUploadUrl] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set(['', '/assets/images', '/uploads']));
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [imageMeta, setImageMeta] = useState<{ width: number; height: number } | null>(null);

  const [editModalOpen, setEditModalOpen] = useState(false);
  const [uploadedDetailOpen, setUploadedDetailOpen] = useState(false);
  const [editPath, setEditPath] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [moveError, setMoveError] = useState<string | null>(null);
  const [moveLoading, setMoveLoading] = useState(false);

  const [atlasError, setAtlasError] = useState<string | null>(null);
  const [atlasResult, setAtlasResult] = useState<{
    imageUrl: string;
    jsonUrl: string;
    count: number;
    sheetSize: { w: number; h: number };
  } | null>(null);

  const [selectedFileMeta, setSelectedFileMeta] = useState<FileMetadata | null>(null);
  const [fullMeta, setFullMeta] = useState<FullImageMetadata | null>(null);
  const [fullMetaPath, setFullMetaPath] = useState<string | null>(null);
  const [fullMetaLoading, setFullMetaLoading] = useState(false);
  const [fullMetaError, setFullMetaError] = useState<string | null>(null);
  const [showFullMeta, setShowFullMeta] = useState(false);
  const [atlasBuilderOpen, setAtlasBuilderOpen] = useState(false);
  const [previewBgMode, setPreviewBgMode] = useState<'dark' | 'light'>('dark');
  const [animStartFrame, setAnimStartFrame] = useState(0);
  const [animEndFrame, setAnimEndFrame] = useState(8);
  const [animFrameRate, setAnimFrameRate] = useState(10);
  const [animCurrentFrame, setAnimCurrentFrame] = useState(0);
  const [animPlaying, setAnimPlaying] = useState(false);
  const [animTotalFrames, setAnimTotalFrames] = useState(0);
  const animCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const animImageRef = useRef<HTMLImageElement | null>(null);

  const fetchTrees = useCallback(async () => {
    try {
      setLoading(true);
      const [cardsTree, uploadedTree] = await Promise.all([
        filesService.getImageTree('manager-assets'),
        filesService.getUploadedTree(),
      ]);
      setCombinedTree(buildCombinedTree(cardsTree, uploadedTree));
    } catch (err) {
      console.error('Failed to fetch file trees:', err);
      setCombinedTree(
        buildCombinedTree([], [])
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTrees();
  }, [fetchTrees]);

  useEffect(() => {
    if (!combinedTree || !selectedPath) {
      setSelectedFileMeta(null);
      setImageMeta(null);
      setFullMeta(null);
      setFullMetaPath(null);
      setFullMetaError(null);
      setFullMetaLoading(false);
      setShowFullMeta(false);
      return;
    }

    const stack: FileTreeItem[] = combinedTree.children ? [...combinedTree.children] : [];
    let found: FileMetadata | null = null;

    while (stack.length) {
      const item = stack.pop()!;
      if (item.path === selectedPath && item.type === 'file') {
        found = item.meta ?? null;
        break;
      }
      if (item.children && item.children.length) {
        stack.push(...item.children);
      }
    }

    setSelectedFileMeta(found);
    setImageMeta(null);
    // Always collapse full metadata when user switches to another image.
    setShowFullMeta(false);
  }, [combinedTree, selectedPath]);

  const handleToggle = (path: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  };

  const handleUploadSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    setUploadError(null);
    if (pendingUploadUrl) {
      URL.revokeObjectURL(pendingUploadUrl);
    }
    setPendingUpload(file);
    setPendingUploadUrl(URL.createObjectURL(file));
  };

  const clearPendingUpload = () => {
    setPendingUpload(null);
    if (pendingUploadUrl) {
      URL.revokeObjectURL(pendingUploadUrl);
    }
    setPendingUploadUrl(null);
  };

  const handleConfirmUpload = async () => {
    if (!pendingUpload) return;
    setUploading(true);
    setUploadError(null);
    try {
      await filesService.uploadImage(pendingUpload);
      clearPendingUpload();
      await fetchTrees();
    } catch (err: unknown) {
      const msg = err && typeof err === 'object' && 'response' in err
        ? (err as { response?: { data?: { error?: string } } }).response?.data?.error
        : 'Upload thất bại';
      setUploadError(msg || 'Upload thất bại');
    } finally {
      setUploading(false);
    }
  };

  const isImagePath = (path: string) =>
    /\.(png|jpg|jpeg|gif|webp|svg|bmp)$/i.test(path);
  const isAnimationSpriteSheet = (path: string) =>
    path.startsWith('/assets/images/animations/') && isImagePath(path);

  const isUploadedFile = (p: string) =>
    p.startsWith('/uploads/') && /\.(png|jpg|jpeg|gif|webp|svg|bmp)$/i.test(p);

  const handleImageLoaded = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    if (img?.naturalWidth && img?.naturalHeight) {
      setImageMeta({
        width: img.naturalWidth,
        height: img.naturalHeight,
      });
    }
  };

  const openEditModal = (filePath: string) => {
    setEditPath(filePath);
    setEditName(basename(filePath));
    setEditError(null);
    if (isUploadedFile(filePath)) {
      setUploadedDetailOpen(true);
    } else {
      setEditModalOpen(true);
    }
  };

  const isCardFile = (p: string) =>
    p.startsWith('/assets/images/cards/') && /\.(png|jpg|jpeg|gif|webp|svg|bmp)$/i.test(p);
  const canRename = editPath !== null && (isUploadedFile(editPath) || isCardFile(editPath));
  const canDelete = editPath !== null && (isUploadedFile(editPath) || isCardFile(editPath));

  const closeEditModal = () => {
    setEditModalOpen(false);
    setUploadedDetailOpen(false);
    setEditPath(null);
    setEditName('');
    setEditError(null);
    setDeleteConfirmOpen(false);
  };

  const handleRename = async () => {
    if (!editPath || !editName.trim()) return;
    const current = basename(editPath);
    const ext = current.includes('.') ? current.slice(current.lastIndexOf('.')) : '';
    const newName = editName.trim().includes('.') ? editName.trim() : editName.trim() + ext;
    if (newName === current) {
      closeEditModal();
      return;
    }
    setEditSaving(true);
    setEditError(null);
    try {
      if (isUploadedFile(editPath)) {
        await filesService.renameUploaded(current, newName);
        await fetchTrees();
        if (selectedPath === editPath) setSelectedPath(`/uploads/${newName}`);
      } else if (isCardFile(editPath)) {
        const res = await filesService.renameCardFile(editPath, newName);
        await fetchTrees();
        if (selectedPath === editPath) setSelectedPath(res.imageUrl);
      } else {
        setEditError('Chỉ có thể đổi tên file trong thư mục uploaded hoặc cards.');
        setEditSaving(false);
        return;
      }
      closeEditModal();
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { error?: string } } }).response?.data?.error
          : 'Đổi tên thất bại';
      setEditError(msg || 'Đổi tên thất bại');
    } finally {
      setEditSaving(false);
    }
  };

  const handleDeleteClick = () => setDeleteConfirmOpen(true);
  const handleDeleteConfirm = async () => {
    if (!editPath) return;
    setEditSaving(true);
    setEditError(null);
    try {
      if (isUploadedFile(editPath)) {
        await filesService.deleteUploaded(basename(editPath));
      } else if (isCardFile(editPath)) {
        await filesService.deleteCardFile(editPath);
      } else {
        setEditError('Chỉ có thể xóa file trong thư mục uploaded hoặc cards.');
        setEditSaving(false);
        setDeleteConfirmOpen(false);
        return;
      }
      await fetchTrees();
      if (selectedPath === editPath) setSelectedPath(null);
      closeEditModal();
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { error?: string } } }).response?.data?.error
          : 'Xóa file thất bại';
      setEditError(msg || 'Xóa file thất bại');
    } finally {
      setEditSaving(false);
      setDeleteConfirmOpen(false);
    }
  };

  const showEditFor = (item: FileTreeItem) => item.type === 'file';

  const isCardFolder = (p: string) =>
    p === '/assets/images/cards' || (p.startsWith('/assets/images/cards/') && p.length > '/assets/images/cards/'.length);
  const isUploadedFolder = (p: string) => p === '/uploads' || (p.startsWith('/uploads/') && p.length > '/uploads/'.length);

  const canDropOnFolder = (targetFolderPath: string, droppedFilePath: string): boolean => {
    const parent = dirname(droppedFilePath);
    const sameParent = targetFolderPath === parent;
    const cardFile = isCardFile(droppedFilePath);
    const cardFolder = isCardFolder(targetFolderPath);
    const uploadedFile = isUploadedFile(droppedFilePath);
    const uploadedFolder = isUploadedFolder(targetFolderPath);
    const result =
      !sameParent &&
      ((cardFile && cardFolder) ||
        (uploadedFile && uploadedFolder) ||
        (uploadedFile && cardFolder));
    return result;
  };

  const handleMoveFile = async (targetFolderPath: string, droppedFilePath: string) => {
    if (!canDropOnFolder(targetFolderPath, droppedFilePath)) return;
    setMoveError(null);
    setMoveLoading(true);
    try {
      if (isCardFile(droppedFilePath)) {
        const res = await filesService.moveCardFile(droppedFilePath, targetFolderPath);
        setMoveError(null);
        await fetchTrees();
        setExpanded((prev) => new Set(prev).add(targetFolderPath));
        if (selectedPath === droppedFilePath) setSelectedPath(res.imageUrl);
      } else if (isUploadedFile(droppedFilePath) && isCardFolder(targetFolderPath)) {
        const res = await filesService.moveUploadedToCards(basename(droppedFilePath), targetFolderPath);
        setMoveError(null);
        await fetchTrees();
        setExpanded((prev) => new Set(prev).add(targetFolderPath));
        if (selectedPath === droppedFilePath) setSelectedPath(res.imageUrl);
      } else if (isUploadedFile(droppedFilePath) && isUploadedFolder(targetFolderPath)) {
        const res = await filesService.moveUploadedFile(basename(droppedFilePath), targetFolderPath);
        setMoveError(null);
        await fetchTrees();
        setExpanded((prev) => new Set(prev).add(targetFolderPath));
        if (selectedPath === droppedFilePath) setSelectedPath(res.imageUrl);
      }
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { error?: string } } }).response?.data?.error
          : 'Di chuyển thất bại';
      setMoveError(msg || 'Di chuyển thất bại');
    } finally {
      setMoveLoading(false);
    }
  };

  const hasPendingUpload = !!pendingUpload && !!pendingUploadUrl;
  const selectedIsImage = selectedPath ? isImagePath(selectedPath) : false;
  const selectedIsAnimationSprite = selectedPath ? isAnimationSpriteSheet(selectedPath) : false;
  const selectedFileName = selectedPath ? basename(selectedPath) : '';
  const selectedFolder = selectedPath ? dirname(selectedPath) : '';
  const selectedExtension = selectedFileName.includes('.') ? selectedFileName.slice(selectedFileName.lastIndexOf('.') + 1) : '';
  const selectedKind = selectedPath
    ? isUploadedFile(selectedPath)
      ? 'Uploaded'
      : isCardFile(selectedPath)
        ? 'Card'
        : 'Khác'
    : '';

  const formatDateTime = (ms?: number) => {
    if (!ms) return '—';
    try {
      return new Date(ms).toLocaleString('vi-VN');
    } catch {
      return '—';
    }
  };

  const formatSize = (size?: number) => {
    if (typeof size !== 'number' || Number.isNaN(size)) return '—';
    if (size < 1024) return `${size} B`;
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
    if (size < 1024 * 1024 * 1024) return `${(size / 1024 / 1024).toFixed(1)} MB`;
    return `${(size / 1024 / 1024 / 1024).toFixed(1)} GB`;
  };

  const handleLoadFullMetadata = async () => {
    if (!selectedPath || fullMetaLoading) return;
    if (fullMeta && fullMetaPath === selectedPath) {
      setShowFullMeta((prev) => !prev);
      return;
    }
    try {
      setFullMetaLoading(true);
      setFullMetaError(null);
      const data = await filesService.getFileMetadata(selectedPath);
      setFullMeta(data);
      setFullMetaPath(selectedPath);
      setShowFullMeta(true);
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { error?: string } } }).response?.data?.error
          : 'Đọc metadata thất bại';
      setFullMetaError(msg || 'Đọc metadata thất bại');
    } finally {
      setFullMetaLoading(false);
    }
  };

  const atlasImages = useMemo(
    () => {
      if (!combinedTree) return [];
      const result: { path: string; name: string }[] = [];
      const stack: FileTreeItem[] = combinedTree.children ? [...combinedTree.children] : [];
      while (stack.length) {
        const item = stack.pop()!;
        if (item.type === 'file' && isImagePath(item.path)) {
          result.push({ path: item.path, name: item.name });
        } else if (item.children && item.children.length) {
          stack.push(...item.children);
        }
      }
      return result;
    },
    [combinedTree]
  );

  const handleOpenAtlasBuilder = () => {
    setAtlasError(null);
    setAtlasBuilderOpen(true);
  };

  const handleAtlasCreated = (result: {
    imageUrl: string;
    jsonUrl: string;
    count: number;
    sheetSize: { w: number; h: number };
  }) => {
    setAtlasResult(result);
    setAtlasError(null);
  };

  const drawAnimationFrame = useCallback((frame: number) => {
    const canvas = animCanvasRef.current;
    const image = animImageRef.current;
    if (!canvas || !image) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const columns = Math.max(1, Math.floor(image.naturalWidth / ANIMATION_FRAME_SIZE));
    const row = Math.floor(frame / columns);
    const col = frame % columns;
    const sx = col * ANIMATION_FRAME_SIZE;
    const sy = row * ANIMATION_FRAME_SIZE;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(
      image,
      sx,
      sy,
      ANIMATION_FRAME_SIZE,
      ANIMATION_FRAME_SIZE,
      0,
      0,
      canvas.width,
      canvas.height
    );
  }, [ANIMATION_FRAME_SIZE]);

  useEffect(() => {
    if (!selectedIsAnimationSprite || !selectedPath) {
      setAnimPlaying(false);
      animImageRef.current = null;
      setAnimTotalFrames(0);
      return;
    }
    const image = new Image();
    image.onload = () => {
      animImageRef.current = image;
      const cols = Math.max(1, Math.floor(image.naturalWidth / ANIMATION_FRAME_SIZE));
      const rows = Math.max(1, Math.floor(image.naturalHeight / ANIMATION_FRAME_SIZE));
      const totalFrames = Math.max(1, cols * rows);
      const defaultEnd = totalFrames - 1;
      setAnimTotalFrames(totalFrames);
      setAnimStartFrame(0);
      setAnimEndFrame(defaultEnd);
      setAnimCurrentFrame(0);
      drawAnimationFrame(0);
    };
    image.src = selectedPath;
    return () => {
      if (animImageRef.current === image) {
        animImageRef.current = null;
      }
    };
  }, [selectedIsAnimationSprite, selectedPath, drawAnimationFrame]);

  useEffect(() => {
    if (!selectedIsAnimationSprite) return;
    const safeStart = Math.max(0, Math.floor(animStartFrame));
    const safeEnd = Math.max(safeStart, Math.floor(animEndFrame));
    setAnimCurrentFrame((prev) => {
      if (prev < safeStart || prev > safeEnd) return safeStart;
      return prev;
    });
  }, [selectedIsAnimationSprite, animStartFrame, animEndFrame]);

  useEffect(() => {
    if (!selectedIsAnimationSprite || !animPlaying) return;
    const safeStart = Math.max(0, Math.floor(animStartFrame));
    const safeEnd = Math.max(safeStart, Math.floor(animEndFrame));
    const intervalMs = Math.max(20, Math.floor(1000 / Math.max(1, animFrameRate)));
    const timer = window.setInterval(() => {
      setAnimCurrentFrame((prev) => (prev >= safeEnd ? safeStart : prev + 1));
    }, intervalMs);
    return () => window.clearInterval(timer);
  }, [selectedIsAnimationSprite, animPlaying, animStartFrame, animEndFrame, animFrameRate]);

  useEffect(() => {
    if (!selectedIsAnimationSprite) return;
    drawAnimationFrame(animCurrentFrame);
  }, [selectedIsAnimationSprite, animCurrentFrame, drawAnimationFrame]);

  const isPreviewLight = previewBgMode === 'light';
  const previewFrameClass = isPreviewLight
    ? 'bg-white'
    : 'bg-slate-900';
  const previewImageClass = isPreviewLight
    ? 'bg-white'
    : 'bg-slate-950';
  const previewHintClass = isPreviewLight
    ? 'text-slate-600'
    : 'text-slate-300';

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Manager Assets"
        description="Quản lý file ảnh: xem cây thư mục và upload ảnh lên thư mục uploaded (REST + Multer)"
      />

      <motion.div
        className="grid grid-cols-1 lg:grid-cols-3 gap-6"
        variants={fadeSlideCard}
        initial="hidden"
        animate="visible"
      >
        <Card className="lg:col-span-2 border bg-card shadow-xl">
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <div>
              <CardTitle className="text-lg font-semibold tracking-tight">
                Preview ảnh
              </CardTitle>
              <p className="mt-1 text-xs text-muted-foreground">
                Xem trước, chỉnh sửa metadata cơ bản và upload ảnh mới.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="px-2"
                onClick={() => setPreviewBgMode((prev) => (prev === 'dark' ? 'light' : 'dark'))}
                title={isPreviewLight ? 'Đổi nền tối' : 'Đổi nền sáng'}
                aria-label={isPreviewLight ? 'Đổi nền tối' : 'Đổi nền sáng'}
              >
                💡
              </Button>
              {hasPendingUpload ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={clearPendingUpload}
                >
                  Bỏ chọn ảnh
                </Button>
              ) : selectedIsImage && selectedPath ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => openEditModal(selectedPath)}
                >
                  Chỉnh sửa chi tiết
                </Button>
              ) : null}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-[minmax(0,1.6fr)_minmax(0,1.1fr)] items-start">
              <div className={`relative flex min-h-[460px] items-center justify-center rounded-xl border border-dashed border-border p-3 ${previewFrameClass}`}>
                {hasPendingUpload && pendingUploadUrl && pendingUpload ? (
                  <img
                    src={pendingUploadUrl}
                    alt={pendingUpload.name}
                    onLoad={handleImageLoaded}
                    className={`max-h-[470px] h-auto w-auto max-w-full rounded-lg border border-border object-contain shadow-md ${previewImageClass}`}
                  />
                ) : selectedIsImage && selectedPath ? (
                  <img
                    src={selectedPath}
                    alt={selectedFileName || 'Preview'}
                    onLoad={handleImageLoaded}
                    className={`max-h-[470px] h-auto w-auto max-w-full rounded-lg border border-border object-contain shadow-md ${previewImageClass}`}
                  />
                ) : (
                  <div className={`flex flex-col items-center justify-center text-center text-sm space-y-2 ${previewHintClass}`}>
                    <div className={`flex h-12 w-12 items-center justify-center rounded-full border border-border ${previewImageClass}`}>
                      <span className="text-2xl leading-none">🖼️</span>
                    </div>
                    <p className="font-medium">
                      Chưa có ảnh được chọn
                    </p>
                    <p className="max-w-xs text-xs">
                      Chọn một file ở cây thư mục bên phải hoặc upload ảnh mới để xem preview tại đây.
                    </p>
                  </div>
                )}
                <p className={`pointer-events-none absolute bottom-2 right-3 text-[11px] ${previewHintClass}`}>
                  Nền {isPreviewLight ? 'sáng' : 'tối'}
                </p>
              </div>

              {selectedIsAnimationSprite && (
                <div className="mt-3 space-y-3 rounded-xl border border-border bg-muted p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setAnimCurrentFrame(Math.max(0, Math.floor(animStartFrame)));
                        setAnimPlaying((prev) => !prev);
                      }}
                    >
                      {animPlaying ? 'Pause' : 'Play'}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setAnimPlaying(false);
                        setAnimCurrentFrame(Math.max(0, Math.floor(animStartFrame)));
                      }}
                    >
                      Reset
                    </Button>
                    <p className="text-[11px] text-muted-foreground">
                      Frame hiện tại: <span className="font-semibold text-foreground">{animCurrentFrame}</span>
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      Tổng frame: <span className="font-semibold text-foreground">{animTotalFrames || '—'}</span>
                    </p>
                  </div>

                  <div className="grid gap-2 sm:grid-cols-3">
                    <label className="space-y-1 text-[11px] text-muted-foreground">
                      <span>Start</span>
                      <input
                        type="number"
                        min={0}
                        value={animStartFrame}
                        onChange={(e) => setAnimStartFrame(Number(e.target.value))}
                        className="block w-full rounded-md border border-input bg-background px-2 py-1 text-xs text-foreground"
                      />
                    </label>
                    <label className="space-y-1 text-[11px] text-muted-foreground">
                      <span>End</span>
                      <input
                        type="number"
                        min={0}
                        value={animEndFrame}
                        onChange={(e) => setAnimEndFrame(Number(e.target.value))}
                        className="block w-full rounded-md border border-input bg-background px-2 py-1 text-xs text-foreground"
                      />
                    </label>
                    <label className="space-y-1 text-[11px] text-muted-foreground">
                      <span>FrameRate</span>
                      <input
                        type="number"
                        min={1}
                        value={animFrameRate}
                        onChange={(e) => setAnimFrameRate(Number(e.target.value))}
                        className="block w-full rounded-md border border-input bg-background px-2 py-1 text-xs text-foreground"
                      />
                    </label>
                  </div>

                  <div className="inline-flex rounded-lg border border-border bg-card p-2">
                    <div className="flex h-[220px] w-[220px] items-center justify-center bg-black/80">
                      <canvas
                        ref={animCanvasRef}
                        width={ANIMATION_FRAME_SIZE}
                        height={ANIMATION_FRAME_SIZE}
                        className="h-[192px] w-[192px] image-rendering-pixelated"
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-3 rounded-xl border border-border bg-muted p-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Metadata
                  </p>
                  {selectedIsImage && selectedPath && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-7 px-2 text-[11px]"
                      onClick={handleLoadFullMetadata}
                      disabled={fullMetaLoading}
                    >
                      {fullMetaLoading
                        ? 'Đang đọc...'
                        : fullMeta && showFullMeta
                          ? 'Ẩn metadata đầy đủ'
                          : 'Xem metadata đầy đủ'}
                    </Button>
                  )}
                </div>

                {hasPendingUpload && pendingUpload ? (
                  <div className="space-y-3 text-xs">
                    <div className="space-y-1">
                      <p className="text-[11px] font-medium text-muted-foreground">Tên file (chưa upload)</p>
                      <p className="truncate rounded-md border border-border bg-card px-2 py-1 font-mono text-[11px] text-foreground">
                        {pendingUpload.name}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <p className="text-[11px] font-medium text-muted-foreground">Dung lượng</p>
                        <p className="rounded-md border border-border bg-card px-2 py-1 text-[11px] text-foreground">
                          {(pendingUpload.size / 1024).toFixed(1)} KB
                        </p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[11px] font-medium text-muted-foreground">Kích thước ảnh</p>
                        <p className="rounded-md border border-border bg-card px-2 py-1 text-[11px] text-foreground">
                          {imageMeta
                            ? `${imageMeta.width} × ${imageMeta.height}px`
                            : '—'}
                        </p>
                      </div>
                    </div>

                    <p className="pt-1 text-[11px] text-muted-foreground">
                      Bấm nút <span className="font-semibold text-foreground">"Upload ảnh này"</span> bên dưới để upload ảnh này vào thư mục <strong>uploaded</strong>.
                    </p>
                  </div>
                ) : selectedIsImage && selectedPath ? (
                  <div className="space-y-3 text-xs">
                    <div className="space-y-1">
                      <p className="text-[11px] font-medium text-muted-foreground">Tên file</p>
                      <p className="truncate rounded-md border border-border bg-card px-2 py-1 font-mono text-[11px] text-foreground">
                        {selectedFileName}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <p className="text-[11px] font-medium text-muted-foreground">Thư mục</p>
                        <p className="line-clamp-2 rounded-md border border-border bg-card px-2 py-1 font-mono text-[11px] text-foreground break-all">
                          {selectedFolder}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[11px] font-medium text-muted-foreground">Loại</p>
                        <p className="rounded-md border border-border bg-card px-2 py-1 text-[11px] text-foreground">
                          {selectedKind || 'Không rõ'}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <p className="text-[11px] font-medium text-muted-foreground">Định dạng</p>
                        <p className="rounded-md border border-border bg-card px-2 py-1 text-[11px] text-foreground uppercase">
                          {selectedExtension || '—'}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[11px] font-medium text-muted-foreground">Kích thước ảnh</p>
                        <p className="rounded-md border border-border bg-card px-2 py-1 text-[11px] text-foreground">
                          {imageMeta
                            ? `${imageMeta.width} × ${imageMeta.height}px`
                            : '—'}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <p className="text-[11px] font-medium text-muted-foreground">Dung lượng file</p>
                        <p className="rounded-md border border-border bg-card px-2 py-1 text-[11px] text-foreground">
                          {formatSize(selectedFileMeta?.size)}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[11px] font-medium text-muted-foreground">Sửa lần cuối</p>
                        <p className="rounded-md border border-border bg-card px-2 py-1 text-[11px] text-foreground">
                          {formatDateTime(selectedFileMeta?.mtimeMs)}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <p className="text-[11px] font-medium text-muted-foreground">Tạo lúc</p>
                      <p className="rounded-md border border-border bg-card px-2 py-1 text-[11px] text-foreground">
                        {formatDateTime(selectedFileMeta?.ctimeMs)}
                      </p>
                    </div>

                    <div className="space-y-1">
                      <p className="text-[11px] font-medium text-muted-foreground">Đường dẫn đầy đủ</p>
                      <p className="line-clamp-2 rounded-md border border-border bg-card px-2 py-1 font-mono text-[11px] text-muted-foreground break-all">
                        {selectedPath}
                      </p>
                    </div>

                    <p className="pt-1 text-[11px] text-muted-foreground">
                      Để đổi tên hoặc chỉnh sửa metadata nâng cao, bấm nút{' '}
                      <span className="font-semibold text-foreground">"Chỉnh sửa chi tiết"</span>.
                    </p>

                    {fullMetaError && (
                      <p className="text-[11px] font-medium text-destructive">
                        {fullMetaError}
                      </p>
                    )}

                    {fullMeta && showFullMeta && (
                      <div className="mt-1 space-y-1">
                        <p className="text-[11px] font-medium text-muted-foreground">
                          Metadata chi tiết (raw)
                        </p>
                        <pre className="max-h-56 overflow-auto rounded-md border border-border bg-card px-2 py-2 text-[10px] font-mono text-muted-foreground">
{JSON.stringify(fullMeta.image, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Khi bạn chọn một ảnh, thông tin chi tiết sẽ hiển thị tại đây.
                  </p>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-3 border-t border-border pt-4 md:flex-row md:items-center md:justify-between">
              <div className="space-y-1 text-xs">
                <p className="font-medium text-foreground">Upload ảnh mới</p>
                <p className="text-[11px] text-muted-foreground">
                  Hỗ trợ các định dạng phổ biến: PNG, JPG, JPEG, WEBP, GIF, SVG, BMP.
                </p>
                {uploading && (
                  <p className="text-[11px] font-medium text-amber-400">
                    Đang upload...
                  </p>
                )}
                {uploadError && (
                  <p className="text-[11px] font-medium text-red-400">
                    {uploadError}
                  </p>
                )}
              </div>
              {!pendingUpload ? (
                <label className="inline-flex cursor-pointer items-center gap-3">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleUploadSelect}
                    disabled={uploading}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    disabled={uploading}
                    className="shadow-md"
                    onClick={(e) => {
                      const input = (e.currentTarget.previousSibling as HTMLInputElement | null);
                      input?.click();
                    }}
                  >
                    {uploading ? 'Đang upload...' : 'Chọn ảnh để upload'}
                  </Button>
                </label>
              ) : (
                <div className="flex items-center gap-3">
                  <Button
                    type="button"
                    disabled={uploading}
                    className="shadow-md"
                    onClick={handleConfirmUpload}
                  >
                    {uploading ? 'Đang upload...' : 'Upload ảnh này'}
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card className="border bg-card shadow-xl">
            <CardHeader>
              <CardTitle>Cây thư mục</CardTitle>
            </CardHeader>
            <CardContent>
              {moveError && (
                <p className="mb-2 text-sm text-red-400">{moveError}</p>
              )}
              {moveLoading && (
                <p className="mb-2 text-sm text-amber-400">Đang di chuyển...</p>
              )}
              {loading ? (
                <p className="text-sm text-muted-foreground">Đang tải cây thư mục...</p>
              ) : combinedTree?.children ? (
                <div className="min-h-[320px] max-h-[60vh] overflow-y-auto rounded-lg border border-border bg-muted p-2">
                  {combinedTree.children.map((item) => (
                    <FileTreeNode
                      key={item.path}
                      item={item}
                      expanded={expanded}
                      onToggle={handleToggle}
                      onSelect={setSelectedPath}
                      onEdit={openEditModal}
                      showEditFor={showEditFor}
                      onDropOnFolder={handleMoveFile}
                      canDropOnFolder={canDropOnFolder}
                    />
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Không có dữ liệu.</p>
              )}
            </CardContent>
          </Card>

          <Card className="border bg-card shadow-xl">
            <CardHeader>
              <CardTitle>Atlas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Tạo atlas từ các ảnh được chọn trong cây assets. File atlas sẽ được lưu vào
                <span className="font-mono text-xs"> TeyvatCard/public/assets/images/cards/</span> và bản copy tạm để xem tại đây.
              </p>
              <Button
                type="button"
                onClick={handleOpenAtlasBuilder}
              >
                Mở Atlas Builder
              </Button>
              {atlasError && <p className="text-sm text-red-400">{atlasError}</p>}
              {atlasResult && (
                <div className="space-y-2 rounded-lg border border-border bg-muted p-3">
                  <p className="text-sm font-medium text-foreground">Kết quả</p>
                  <p className="text-xs text-muted-foreground">
                    {atlasResult.count} ảnh · Sheet {atlasResult.sheetSize.w}×{atlasResult.sheetSize.h}
                  </p>
                  <img
                    src={atlasResult.imageUrl}
                        alt="all-cards atlas"
                        className="max-h-48 max-w-full rounded border border-border bg-muted object-contain"
                  />
                  <div className="flex flex-wrap gap-2 text-xs">
                    <a
                      href={atlasResult.imageUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary underline"
                    >
                      all-cards.webp
                    </a>
                    <a
                      href={atlasResult.jsonUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary underline"
                    >
                      all-cards.json
                    </a>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Sau này có thể lưu link atlas vào env.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </motion.div>

      {editModalOpen && editPath &&
        createPortal(
        <div
          className="fixed inset-0 top-0 left-0 right-0 bottom-0 min-h-screen min-w-screen w-full h-full z-[9999] flex items-center justify-center bg-black/60 p-4"
          onClick={closeEditModal}
        >
          <Card
            className="w-full max-w-md border bg-card shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Chỉnh sửa</CardTitle>
              <Button type="button" variant="ghost" size="sm" onClick={closeEditModal}>
                ✕
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <AnimatePresence mode="wait">
                {deleteConfirmOpen && canDelete ? (
                  <motion.div
                    key="confirm-delete-main"
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
                          {editPath}
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
                    key="edit-main"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.2, ease: 'easeOut' }}
                    layout
                  >
                    {!canRename && !canDelete && (
                      <p className="text-sm text-muted-foreground">
                        Có thể đổi tên và xóa file trong thư mục <strong>uploaded</strong> hoặc <strong>cards</strong>.
                      </p>
                    )}
                    <div>
                      <label className="text-sm font-medium">Tên</label>
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        disabled={!canRename}
                        className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground disabled:bg-muted disabled:opacity-60"
                      />
                    </div>
                    {editError && <p className="text-sm text-destructive">{editError}</p>}
                    <div className="flex flex-wrap gap-2">
                      <Button onClick={handleRename} disabled={editSaving || !canRename}>
                        Lưu tên
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleDeleteClick}
                        disabled={editSaving || !canDelete}
                      >
                        Xóa file
                      </Button>
                      <Button type="button" variant="ghost" onClick={closeEditModal}>
                        Đóng
                      </Button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </CardContent>
          </Card>
        </div>,
        document.body
      )}

      {uploadedDetailOpen && editPath && isUploadedFile(editPath) && (
        <UploadedImageEditModal
          filePath={editPath}
          onClose={closeEditModal}
          onSuccess={fetchTrees}
        />
      )}

      {atlasBuilderOpen && createPortal(
        <AtlasBuilderModal
          images={atlasImages}
          onClose={() => setAtlasBuilderOpen(false)}
          onCreated={(result) => {
            handleAtlasCreated(result);
            setAtlasBuilderOpen(false);
          }}
        />,
        document.body
      )}
    </div>
  );
}
