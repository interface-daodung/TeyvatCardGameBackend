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
import { ImageLightbox } from '../components/ui/ImageLightbox';
import { SpriteFramePreviewPanel } from '../components/assets/SpriteFramePreviewPanel';
import { JsonRawHighlight } from '../components/assets/JsonRawHighlight';
import { TabPanelLoading } from '../components/assets/TabPanelLoading';
import { SPRITESHEET_FRAME_HEIGHT, SPRITESHEET_FRAME_WIDTH } from '../components/characters/characterDetailUtils';
import { cn } from '../lib/utils';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import type { IconProp } from '@fortawesome/fontawesome-svg-core';
import { faUpload, faPenToSquare, faLightbulb as faLightbulbSolid, faXmark } from '@fortawesome/free-solid-svg-icons';
import { faLightbulb as faLightbulbRegular } from '@fortawesome/free-regular-svg-icons';

type PreviewAreaTab = 'preview' | 'animation' | 'metadata' | 'raw';

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

/** Double-click fullscreen for animation canvas wrappers (Chrome + Safari). */
function toggleFullscreenForElement(el: HTMLElement | null) {
  if (!el) return;
  const doc = document as Document & {
    webkitFullscreenElement?: Element | null;
    webkitExitFullscreen?: () => Promise<void>;
  };
  const fsEl = document.fullscreenElement ?? doc.webkitFullscreenElement ?? null;
  const exit = () => document.exitFullscreen?.() ?? doc.webkitExitFullscreen?.();
  const enter = () =>
    el.requestFullscreen?.() ??
    (el as HTMLElement & { webkitRequestFullscreen?: () => Promise<void> }).webkitRequestFullscreen?.();

  if (fsEl === el) {
    void exit()?.catch(() => {});
    return;
  }
  if (fsEl) {
    void Promise.resolve(exit?.())
      .then(() => enter())
      .catch(() => void enter()?.catch(() => {}));
    return;
  }
  void enter()?.catch(() => {});
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
  const [atlasBuilderOpen, setAtlasBuilderOpen] = useState(false);
  const [previewBgMode, setPreviewBgMode] = useState<'dark' | 'light'>('light');
  const [animStartFrame, setAnimStartFrame] = useState(0);
  const [animEndFrame, setAnimEndFrame] = useState(8);
  const [animFrameRate, setAnimFrameRate] = useState(10);
  const [animCurrentFrame, setAnimCurrentFrame] = useState(0);
  const [animPlaying, setAnimPlaying] = useState(false);
  const [animTotalFrames, setAnimTotalFrames] = useState(0);
  const [ssStartFrame, setSsStartFrame] = useState(0);
  const [ssEndFrame, setSsEndFrame] = useState(8);
  const [ssFrameRate, setSsFrameRate] = useState(10);
  const [ssCurrentFrame, setSsCurrentFrame] = useState(0);
  const [ssPlaying, setSsPlaying] = useState(false);
  const [ssTotalFrames, setSsTotalFrames] = useState(0);
  const [previewLightbox, setPreviewLightbox] = useState<{ src: string; alt: string } | null>(null);
  const [previewAreaTab, setPreviewAreaTab] = useState<PreviewAreaTab>('preview');
  const [previewImageLoading, setPreviewImageLoading] = useState(false);
  const [animSpriteReady, setAnimSpriteReady] = useState(false);
  const [ssSpriteReady, setSsSpriteReady] = useState(false);
  const animCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const animImageRef = useRef<HTMLImageElement | null>(null);
  const ssCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const ssImageRef = useRef<HTMLImageElement | null>(null);
  const ssAnimFsWrapRef = useRef<HTMLDivElement | null>(null);
  const animAnimFsWrapRef = useRef<HTMLDivElement | null>(null);
  const uploadInputRef = useRef<HTMLInputElement | null>(null);

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

  /** Cùng thư mục character Spritesheet (cards/character/Spritesheet) — không phân biệt hoa thường. */
  const isSpritesheetFolderImage = (path: string) => {
    if (!isImagePath(path)) return false;
    const parent = dirname(path).replace(/\\/g, '/');
    const last = parent.split('/').pop()?.toLowerCase();
    return last === 'spritesheet';
  };

  const isUploadedFile = (p: string) =>
    p.startsWith('/uploads/') && /\.(png|jpg|jpeg|gif|webp|svg|bmp)$/i.test(p);

  const handleImageLoaded = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    setPreviewImageLoading(false);
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
  const selectedIsSpritesheetFolder = selectedPath ? isSpritesheetFolderImage(selectedPath) : false;
  const hasFramePreview = selectedIsAnimationSprite || selectedIsSpritesheetFolder;
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

  const fetchFullMetadataIfNeeded = useCallback(async () => {
    if (!selectedPath || fullMetaLoading) return;
    if (fullMeta && fullMetaPath === selectedPath) return;
    try {
      setFullMetaLoading(true);
      setFullMetaError(null);
      const data = await filesService.getFileMetadata(selectedPath);
      setFullMeta(data);
      setFullMetaPath(selectedPath);
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { error?: string } } }).response?.data?.error
          : 'Đọc metadata thất bại';
      setFullMetaError(msg || 'Đọc metadata thất bại');
    } finally {
      setFullMetaLoading(false);
    }
  }, [selectedPath, fullMetaLoading, fullMeta, fullMetaPath]);

  const canFetchRawMeta = Boolean(selectedIsImage && selectedPath && !hasPendingUpload);

  useEffect(() => {
    if (hasPendingUpload && pendingUploadUrl) {
      setPreviewImageLoading(true);
      return;
    }
    if (selectedIsImage && selectedPath) {
      setPreviewImageLoading(true);
      return;
    }
    setPreviewImageLoading(false);
  }, [hasPendingUpload, pendingUploadUrl, selectedIsImage, selectedPath]);

  useEffect(() => {
    if (previewAreaTab !== 'raw' || !canFetchRawMeta) return;
    void fetchFullMetadataIfNeeded();
  }, [previewAreaTab, canFetchRawMeta, fetchFullMetadataIfNeeded]);

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

  const drawSpritesheetFrame = useCallback((frame: number) => {
    const canvas = ssCanvasRef.current;
    const image = ssImageRef.current;
    if (!canvas || !image) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const columns = Math.max(1, Math.floor(image.naturalWidth / SPRITESHEET_FRAME_WIDTH));
    const row = Math.floor(frame / columns);
    const col = frame % columns;
    const sx = col * SPRITESHEET_FRAME_WIDTH;
    const sy = row * SPRITESHEET_FRAME_HEIGHT;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(
      image,
      sx,
      sy,
      SPRITESHEET_FRAME_WIDTH,
      SPRITESHEET_FRAME_HEIGHT,
      0,
      0,
      SPRITESHEET_FRAME_WIDTH,
      SPRITESHEET_FRAME_HEIGHT
    );
  }, []);

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
      setAnimSpriteReady(false);
      return;
    }
    setAnimSpriteReady(false);
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
      setAnimSpriteReady(true);
    };
    image.onerror = () => {
      setAnimSpriteReady(true);
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

  useEffect(() => {
    if (!selectedIsSpritesheetFolder || !selectedPath) {
      setSsPlaying(false);
      ssImageRef.current = null;
      setSsTotalFrames(0);
      setSsSpriteReady(false);
      return;
    }
    setSsSpriteReady(false);
    const image = new Image();
    image.onload = () => {
      ssImageRef.current = image;
      const cols = Math.max(1, Math.floor(image.naturalWidth / SPRITESHEET_FRAME_WIDTH));
      const rows = Math.max(1, Math.floor(image.naturalHeight / SPRITESHEET_FRAME_HEIGHT));
      const totalFrames = Math.max(1, cols * rows);
      const defaultEnd = totalFrames - 1;
      setSsTotalFrames(totalFrames);
      setSsStartFrame(0);
      setSsEndFrame(defaultEnd);
      setSsCurrentFrame(0);
      drawSpritesheetFrame(0);
      setSsSpriteReady(true);
    };
    image.onerror = () => {
      setSsSpriteReady(true);
    };
    image.crossOrigin = 'anonymous';
    image.src = selectedPath;
    return () => {
      if (ssImageRef.current === image) {
        ssImageRef.current = null;
      }
    };
  }, [selectedIsSpritesheetFolder, selectedPath, drawSpritesheetFrame]);

  useEffect(() => {
    if (!selectedIsSpritesheetFolder) return;
    const safeStart = Math.max(0, Math.floor(ssStartFrame));
    const safeEnd = Math.max(safeStart, Math.floor(ssEndFrame));
    setSsCurrentFrame((prev) => {
      if (prev < safeStart || prev > safeEnd) return safeStart;
      return prev;
    });
  }, [selectedIsSpritesheetFolder, ssStartFrame, ssEndFrame]);

  useEffect(() => {
    if (!selectedIsSpritesheetFolder || !ssPlaying) return;
    const safeStart = Math.max(0, Math.floor(ssStartFrame));
    const safeEnd = Math.max(safeStart, Math.floor(ssEndFrame));
    const intervalMs = Math.max(20, Math.floor(1000 / Math.max(1, ssFrameRate)));
    const timer = window.setInterval(() => {
      setSsCurrentFrame((prev) => (prev >= safeEnd ? safeStart : prev + 1));
    }, intervalMs);
    return () => window.clearInterval(timer);
  }, [selectedIsSpritesheetFolder, ssPlaying, ssStartFrame, ssEndFrame, ssFrameRate]);

  useEffect(() => {
    if (!selectedIsSpritesheetFolder) return;
    drawSpritesheetFrame(ssCurrentFrame);
  }, [selectedIsSpritesheetFolder, ssCurrentFrame, drawSpritesheetFrame]);

  useEffect(() => {
    setPreviewAreaTab('preview');
    setFullMeta(null);
    setFullMetaPath(null);
    setFullMetaError(null);
    setAnimSpriteReady(false);
    setSsSpriteReady(false);
  }, [selectedPath]);

  useEffect(() => {
    if (!hasFramePreview && previewAreaTab === 'animation') {
      setPreviewAreaTab('preview');
    }
  }, [hasFramePreview, previewAreaTab]);

  useEffect(() => {
    if (!canFetchRawMeta && previewAreaTab === 'raw') {
      setPreviewAreaTab('preview');
    }
  }, [canFetchRawMeta, previewAreaTab]);

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

  const animationTabBusy =
    hasFramePreview &&
    previewAreaTab === 'animation' &&
    ((selectedIsSpritesheetFolder && !ssSpriteReady) ||
      (selectedIsAnimationSprite && !animSpriteReady));

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
        <Card className="flex w-full flex-col self-start lg:col-span-2 border bg-card shadow-xl">
          <CardHeader className="flex flex-col gap-3 space-y-0 pb-2">
            <div className="flex flex-row items-start justify-between gap-2">
              <CardTitle className="text-lg font-semibold tracking-tight">
                Image preview
              </CardTitle>
              <div className="flex shrink-0 items-center gap-2">
                <input
                  ref={uploadInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleUploadSelect}
                  disabled={uploading}
                  className="hidden"
                  aria-hidden
                />
                {hasPendingUpload ? (
                  <>
                    <Button
                      type="button"
                      variant="default"
                      size="sm"
                      className="shrink-0"
                      disabled={uploading}
                      onClick={handleConfirmUpload}
                      title="Upload this image to the uploaded folder"
                    >
                      {uploading ? 'Uploading…' : 'Upload this image'}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="h-9 w-9 shrink-0"
                      onClick={clearPendingUpload}
                      title="Clear pending image"
                      aria-label="Clear pending image"
                    >
                      <FontAwesomeIcon icon={faXmark} className="h-4 w-4" />
                    </Button>
                  </>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-9 w-9 shrink-0"
                    disabled={uploading}
                    onClick={() => uploadInputRef.current?.click()}
                    title="Choose image to upload"
                    aria-label="Choose image to upload"
                  >
                    <FontAwesomeIcon icon={faUpload} className="h-4 w-4" />
                  </Button>
                )}
                {selectedIsImage && selectedPath && !hasPendingUpload ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-9 w-9 shrink-0"
                    onClick={() => openEditModal(selectedPath)}
                    title="Edit details"
                    aria-label="Edit details"
                  >
                    <FontAwesomeIcon icon={faPenToSquare} className="h-4 w-4" />
                  </Button>
                ) : null}
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-9 w-9 shrink-0"
                  onClick={() => setPreviewBgMode((prev) => (prev === 'dark' ? 'light' : 'dark'))}
                  title={isPreviewLight ? 'Switch preview to dark background' : 'Switch preview to light background'}
                  aria-label={isPreviewLight ? 'Switch preview to dark background' : 'Switch preview to light background'}
                >
                  <FontAwesomeIcon
                    icon={(isPreviewLight ? faLightbulbRegular : faLightbulbSolid) as IconProp}
                    className="h-4 w-4"
                  />
                </Button>
              </div>
            </div>
            {(uploading || uploadError) && (
              <div className="flex flex-col items-end gap-1 text-xs">
                {uploading && (
                  <p className="font-medium text-amber-400">Uploading…</p>
                )}
                {uploadError && (
                  <p className="font-medium text-red-400">{uploadError}</p>
                )}
              </div>
            )}
          </CardHeader>
          <CardContent className="pt-0">
            <div className="mx-auto flex h-[clamp(460px,58vh,620px)] w-full min-h-[460px] max-h-[620px] flex-col overflow-hidden">
            <div
              className="flex w-full min-w-0 shrink-0 flex-wrap gap-0 border-b border-border"
              role="tablist"
              aria-label="Preview area tabs"
            >
              <button
                type="button"
                role="tab"
                id="manager-assets-tab-preview"
                aria-selected={previewAreaTab === 'preview'}
                className={cn(
                  '-mb-px border-b-2 px-3 py-2 text-sm font-medium transition-colors',
                  previewAreaTab === 'preview'
                    ? 'border-primary text-foreground'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                )}
                onClick={() => setPreviewAreaTab('preview')}
              >
                Preview
              </button>
              {hasFramePreview && (
                <button
                  type="button"
                  role="tab"
                  id="manager-assets-tab-animation"
                  aria-selected={previewAreaTab === 'animation'}
                  className={cn(
                    '-mb-px border-b-2 px-3 py-2 text-sm font-medium transition-colors',
                    previewAreaTab === 'animation'
                      ? 'border-primary text-foreground'
                      : 'border-transparent text-muted-foreground hover:text-foreground'
                  )}
                  onClick={() => setPreviewAreaTab('animation')}
                >
                  Animation
                </button>
              )}
              <button
                type="button"
                role="tab"
                id="manager-assets-tab-metadata"
                aria-selected={previewAreaTab === 'metadata'}
                className={cn(
                  '-mb-px border-b-2 px-3 py-2 text-sm font-medium transition-colors',
                  previewAreaTab === 'metadata'
                    ? 'border-primary text-foreground'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                )}
                onClick={() => setPreviewAreaTab('metadata')}
              >
                Metadata
              </button>
              <button
                type="button"
                role="tab"
                id="manager-assets-tab-raw"
                aria-selected={previewAreaTab === 'raw'}
                disabled={!canFetchRawMeta}
                title={!canFetchRawMeta ? 'Select a saved image file (not a pending upload)' : undefined}
                className={cn(
                  '-mb-px border-b-2 px-3 py-2 text-sm font-medium transition-colors',
                  !canFetchRawMeta && 'cursor-not-allowed opacity-50',
                  previewAreaTab === 'raw'
                    ? 'border-primary text-foreground'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                )}
                onClick={() => {
                  if (canFetchRawMeta) setPreviewAreaTab('raw');
                }}
              >
                raw
              </button>
            </div>
            <div className="flex min-h-0 flex-1 flex-col overflow-y-auto pt-3">
              {previewAreaTab === 'preview' && (
                <div className="relative flex min-h-0 flex-1 flex-col">
                  <div
                    role="tabpanel"
                    id="manager-assets-panel-preview"
                    aria-labelledby="manager-assets-tab-preview"
                    className={`relative flex min-h-0 flex-1 items-center justify-center rounded-xl border border-dashed border-border p-3 ${previewFrameClass}`}
                  >
                  {hasPendingUpload && pendingUploadUrl && pendingUpload ? (
                    <img
                      src={pendingUploadUrl}
                      alt={pendingUpload.name}
                      onLoad={handleImageLoaded}
                      onError={() => setPreviewImageLoading(false)}
                      onClick={() => setPreviewLightbox({ src: pendingUploadUrl, alt: pendingUpload.name })}
                      className={`max-h-[min(470px,100%)] h-auto w-auto max-w-full cursor-zoom-in rounded-lg border border-border object-contain object-center shadow-md ${previewImageClass}`}
                    />
                  ) : selectedIsImage && selectedPath ? (
                    <img
                      src={selectedPath}
                      alt={selectedFileName || 'Preview'}
                      onLoad={handleImageLoaded}
                      onError={() => setPreviewImageLoading(false)}
                      onClick={() =>
                        setPreviewLightbox({
                          src: selectedPath,
                          alt: selectedFileName || 'Preview',
                        })
                      }
                      className={`max-h-[min(470px,100%)] h-auto w-auto max-w-full cursor-zoom-in rounded-lg border border-border object-contain object-center shadow-md ${previewImageClass}`}
                    />
                  ) : (
                    <div className={`flex flex-col items-center justify-center gap-2 py-6 text-center text-sm ${previewHintClass}`}>
                      <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-border ${previewImageClass}`}>
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
                  </div>
                  <TabPanelLoading
                    show={
                      previewImageLoading &&
                      (Boolean(hasPendingUpload && pendingUploadUrl) || Boolean(selectedIsImage && selectedPath))
                    }
                    label="Đang tải ảnh..."
                  />
                </div>
              )}

              {hasFramePreview && previewAreaTab === 'animation' && (
                <div className="relative flex h-full min-h-0 w-full max-h-full flex-1 flex-col overflow-hidden">
                  <div
                    role="tabpanel"
                    id="manager-assets-panel-animation"
                    aria-labelledby="manager-assets-tab-animation"
                    className="flex min-h-0 flex-1 flex-col overflow-hidden"
                  >
                  {selectedIsSpritesheetFolder && (
                    <SpriteFramePreviewPanel
                      className="mt-0 flex h-full min-h-0 w-full flex-1 flex-col"
                      caption={
                        <p className="text-[11px] text-muted-foreground">
                          Spritesheet — frame {SPRITESHEET_FRAME_WIDTH}×{SPRITESHEET_FRAME_HEIGHT}px
                        </p>
                      }
                      playing={ssPlaying}
                      onTogglePlay={() => setSsPlaying((prev) => !prev)}
                      onReset={() => {
                        setSsPlaying(false);
                        setSsCurrentFrame(Math.max(0, Math.floor(ssStartFrame)));
                      }}
                      currentFrame={ssCurrentFrame}
                      totalFrames={ssTotalFrames}
                      startFrame={ssStartFrame}
                      endFrame={ssEndFrame}
                      frameRate={ssFrameRate}
                      onStartFrameChange={setSsStartFrame}
                      onEndFrameChange={setSsEndFrame}
                      onFrameRateChange={setSsFrameRate}
                      canvas={
                        <div
                          ref={ssAnimFsWrapRef}
                          role="presentation"
                          className="flex h-full min-h-0 w-full min-w-0 cursor-pointer items-center justify-center bg-black/80 p-1 [:fullscreen]:min-h-screen [:fullscreen]:w-screen [:fullscreen]:bg-black [:fullscreen]:p-4"
                          onDoubleClick={() => toggleFullscreenForElement(ssAnimFsWrapRef.current)}
                          title="Double-click for fullscreen"
                          aria-label="Animation preview: double-click for fullscreen"
                        >
                          <canvas
                            ref={ssCanvasRef}
                            width={SPRITESHEET_FRAME_WIDTH}
                            height={SPRITESHEET_FRAME_HEIGHT}
                            className="max-h-full max-w-full object-contain image-rendering-pixelated"
                          />
                        </div>
                      }
                    />
                  )}
                  {selectedIsAnimationSprite && (
                    <SpriteFramePreviewPanel
                      className="mt-0 flex h-full min-h-0 w-full flex-1 flex-col"
                      caption={
                        <p className="text-[11px] text-muted-foreground">
                          Spritesheet — frame {ANIMATION_FRAME_SIZE}×{ANIMATION_FRAME_SIZE}px
                        </p>
                      }
                      playing={animPlaying}
                      onTogglePlay={() => setAnimPlaying((prev) => !prev)}
                      onReset={() => {
                        setAnimPlaying(false);
                        setAnimCurrentFrame(Math.max(0, Math.floor(animStartFrame)));
                      }}
                      currentFrame={animCurrentFrame}
                      totalFrames={animTotalFrames}
                      startFrame={animStartFrame}
                      endFrame={animEndFrame}
                      frameRate={animFrameRate}
                      onStartFrameChange={setAnimStartFrame}
                      onEndFrameChange={setAnimEndFrame}
                      onFrameRateChange={setAnimFrameRate}
                      canvas={
                        <div
                          ref={animAnimFsWrapRef}
                          role="presentation"
                          className="flex h-full min-h-0 w-full min-w-0 cursor-pointer items-center justify-center bg-black/80 p-1 [:fullscreen]:min-h-screen [:fullscreen]:w-screen [:fullscreen]:bg-black [:fullscreen]:p-4"
                          onDoubleClick={() => toggleFullscreenForElement(animAnimFsWrapRef.current)}
                          title="Double-click for fullscreen"
                          aria-label="Animation preview: double-click for fullscreen"
                        >
                          <canvas
                            ref={animCanvasRef}
                            width={ANIMATION_FRAME_SIZE}
                            height={ANIMATION_FRAME_SIZE}
                            className="max-h-full max-w-full object-contain image-rendering-pixelated"
                          />
                        </div>
                      }
                    />
                  )}
                  </div>
                  <TabPanelLoading show={animationTabBusy} label="Đang tải animation..." />
                </div>
              )}

              {previewAreaTab === 'metadata' && (
                <div
                  role="tabpanel"
                  id="manager-assets-panel-metadata"
                  aria-labelledby="manager-assets-tab-metadata"
                  className="relative min-h-0 w-full flex-1 space-y-3 rounded-xl border border-border bg-muted p-4"
                >
                <TabPanelLoading show={loading} label="Đang tải cây thư mục..." />
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
                      Use <span className="font-semibold text-foreground">Upload this image</span> in the header to save to the <strong>uploaded</strong> folder.
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
                      Rename or advanced metadata: use the <span className="font-semibold text-foreground">Edit details</span> button in the header.
                      Server JSON: <span className="font-semibold text-foreground">raw</span> tab.
                    </p>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Khi bạn chọn một ảnh, thông tin chi tiết sẽ hiển thị tại đây.
                  </p>
                )}
                </div>
              )}

              {previewAreaTab === 'raw' && (
                <div
                  role="tabpanel"
                  id="manager-assets-panel-raw"
                  aria-labelledby="manager-assets-tab-raw"
                  className="relative min-h-0 w-full flex-1 space-y-2 rounded-xl border border-border bg-muted p-4"
                >
                  {!canFetchRawMeta ? (
                    <p className="text-sm text-muted-foreground">
                      Chọn một file ảnh đã lưu trên server (không dùng ảnh chờ upload) để xem JSON raw.
                    </p>
                  ) : (
                    <>
                      {fullMetaError && (
                        <p className="text-sm font-medium text-destructive">{fullMetaError}</p>
                      )}
                      {fullMeta && fullMetaPath === selectedPath && fullMeta.image !== undefined ? (
                        <JsonRawHighlight data={fullMeta.image} />
                      ) : !fullMetaLoading && !fullMetaError ? (
                        <p className="text-sm text-muted-foreground">Không có dữ liệu raw.</p>
                      ) : null}
                      <TabPanelLoading show={fullMetaLoading} label="Đang đọc metadata..." />
                    </>
                  )}
                </div>
              )}
            </div>
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

      <ImageLightbox
        open={previewLightbox}
        onClose={() => setPreviewLightbox(null)}
      />
    </div>
  );
}
