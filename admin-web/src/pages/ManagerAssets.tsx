import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { PageHeader } from '../components/PageHeader';
import { FileTreeNode } from '../components/FileTreeNode';
import {
  fadeSlideCard,
  managerAssetsPreviewPanel,
  managerAssetsTreeRowLayoutTransition,
} from '../components/animations/motionPresets';
import { UploadedImageEditModal } from '../components/assets/UploadedImageEditModal';
import { AtlasBuilderModal } from '../components/assets/AtlasBuilderModal';
import { AtlasAnimationModal } from '../components/assets/AtlasAnimationModal';
import { SpritesheetEditModal } from '../components/assets/SpritesheetEditModal';
import { AnimationEditModal } from '../components/assets/AnimationEditModal';
import { isPathExcludedFromAtlasBuilder } from '../components/assets/atlasImageKind';
import { AtlasViewModal } from '../components/assets/AtlasViewModal';
import {
  filesService,
  type FileTreeItem,
  type FileMetadata,
  type FullImageMetadata,
  type AtlasFileEntry,
} from '../services/filesService';
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
import {
  faUpload,
  faPenToSquare,
  faLightbulb as faLightbulbSolid,
  faXmark,
  faExpand,
  faCompress,
  faArrowsRotate,
} from '@fortawesome/free-solid-svg-icons';
import { faLightbulb as faLightbulbRegular } from '@fortawesome/free-regular-svg-icons';

type PreviewAreaTab = 'preview' | 'animation' | 'metadata' | 'raw';
type AtlasListScopeTab = 'default' | 'desktop' | 'mobile';

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

const FILE_NAME_REGEX = /^[a-zA-Z0-9._-]+$/;

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
  const [moveConfirm, setMoveConfirm] = useState<{
    from: string;
    to: string;
    filePath: string;
    fileName: string;
  } | null>(null);

  const [atlasError, setAtlasError] = useState<string | null>(null);
  const [atlasList, setAtlasList] = useState<AtlasFileEntry[]>([]);
  const [atlasListScope, setAtlasListScope] = useState<AtlasListScopeTab>('default');
  const [deletingAtlasNames, setDeletingAtlasNames] = useState<Set<string>>(new Set());
  const [atlasListLoading, setAtlasListLoading] = useState(true);
  const [atlasListError, setAtlasListError] = useState<string | null>(null);
  const [atlasViewEntry, setAtlasViewEntry] = useState<AtlasFileEntry | null>(null);

  const [selectedFileMeta, setSelectedFileMeta] = useState<FileMetadata | null>(null);
  const [fullMeta, setFullMeta] = useState<FullImageMetadata | null>(null);
  const [fullMetaPath, setFullMetaPath] = useState<string | null>(null);
  const [fullMetaLoading, setFullMetaLoading] = useState(false);
  const [fullMetaError, setFullMetaError] = useState<string | null>(null);
  const [atlasBuilderOpen, setAtlasBuilderOpen] = useState(false);
  const [atlasAnimationOpen, setAtlasAnimationOpen] = useState(false);
  const [spritesheetEditOpen, setSpritesheetEditOpen] = useState(false);
  const [animationEditOpen, setAnimationEditOpen] = useState(false);
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
  /** Cây mở rộng: ẩn hoàn toàn Image preview (có animation thu/phóng chiều rộng). */
  const [treeExpanded, setTreeExpanded] = useState(false);
  /**
   * Chỉ dùng làm React `key` để phân biệt lần mount preview:
   * - Lần đầu (0): `initial={false}` → không chạy animation mở rộng khi vào trang.
   * - Sau khi đã từng mở rộng cây rồi thu (1,2,…): mount lại với `initial="hidden"` → có animation mở rộng chiều rộng.
   * Không liên quan tới animation thu nhỏ (thu do variant `exit` + AnimatePresence).
   */
  const [previewEnterRemountKey, setPreviewEnterRemountKey] = useState(0);

  const collapseTree = useCallback(() => {
    setTreeExpanded((prev) => {
      if (prev) setPreviewEnterRemountKey((k) => k + 1);
      return false;
    });
  }, []);

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

  const handleResetTree = useCallback(() => {
    setExpanded(new Set(['', '/assets/images', '/uploads']));
    void fetchTrees();
  }, [fetchTrees]);

  useEffect(() => {
    fetchTrees();
  }, [fetchTrees]);

  const fetchAtlasList = useCallback(async () => {
    setAtlasListLoading(true);
    setAtlasListError(null);
    try {
      const items = await filesService.getAtlasList(atlasListScope);
      setAtlasList(items);
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { error?: string } } }).response?.data?.error
          : 'Không tải được danh sách atlas';
      setAtlasListError(msg || 'Không tải được danh sách atlas');
      setAtlasList([]);
    } finally {
      setAtlasListLoading(false);
    }
  }, [atlasListScope]);

  useEffect(() => {
    void fetchAtlasList();
  }, [fetchAtlasList]);

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

  const handleFileDoubleClickExitExpandedTree = useCallback((path: string) => {
    setSelectedPath(path);
    collapseTree();
  }, [collapseTree]);

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

  /** Spritesheet trong `assets/images/Spritesheet` (hoặc thư mục con tên Spritesheet) — không phân biệt hoa thường. */
  const isSpritesheetFolderImage = (path: string) => {
    if (!isImagePath(path)) return false;
    const parent = dirname(path).replace(/\\/g, '/');
    const last = parent.split('/').pop()?.toLowerCase();
    return last === 'spritesheet';
  };

  const isUploadedFile = (p: string) =>
    p.startsWith('/uploads/') &&
    !p.startsWith('/uploads/tmp/') &&
    !p.startsWith('/uploads/resize/') &&
    !p.startsWith('/uploads/lossy/') &&
    /\.(png|jpg|jpeg|gif|webp|svg|bmp)$/i.test(p);
  const isAssetsImageFile = (p: string) => p.startsWith('/assets/images/');

  const getNormalizedRenameTarget = useCallback((currentPath: string, rawName: string): string | null => {
    const current = basename(currentPath);
    const trimmed = rawName.trim();
    if (!trimmed) return null;
    const ext = current.includes('.') ? current.slice(current.lastIndexOf('.')) : '';
    const candidate = trimmed.includes('.') ? trimmed : `${trimmed}${ext}`;
    if (!FILE_NAME_REGEX.test(candidate)) return null;
    return candidate;
  }, []);

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
    if (isUploadedFile(filePath) || (isAssetsImageFile(filePath) && isImagePath(filePath))) {
      setUploadedDetailOpen(true);
    } else {
      setEditModalOpen(true);
    }
  };

  const isCardFile = (p: string) =>
    p.startsWith('/assets/images/cards/') && /\.(png|jpg|jpeg|gif|webp|svg|bmp)$/i.test(p);
  const canRename = editPath !== null && (isUploadedFile(editPath) || isAssetsImageFile(editPath));
  const canDelete = editPath !== null && (isUploadedFile(editPath) || isCardFile(editPath));
  const normalizedRenameTarget = editPath ? getNormalizedRenameTarget(editPath, editName) : null;
  const renameNameError =
    editPath && editName.trim().length > 0 && !normalizedRenameTarget
      ? 'Tên file chỉ được chứa chữ, số, dấu chấm, gạch ngang, gạch dưới.'
      : null;

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
    const newName = getNormalizedRenameTarget(editPath, editName);
    if (!newName) {
      setEditError('Tên file mới không hợp lệ.');
      return;
    }
    if (newName === current) {
      closeEditModal();
      return;
    }
    setEditSaving(true);
    setEditError(null);
    try {
      if (isUploadedFile(editPath)) {
        const res = await filesService.renameUploaded(current, newName, editPath);
        await fetchTrees();
        if (selectedPath === editPath) setSelectedPath(res.imageUrl);
      } else if (isAssetsImageFile(editPath)) {
        const res = await filesService.renameAssetsFile(editPath, newName);
        await fetchTrees();
        if (selectedPath === editPath) setSelectedPath(res.imageUrl);
      } else {
        setEditError('Chỉ có thể đổi tên file trong thư mục uploaded hoặc assets/images.');
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

  const showEditFor = (item: FileTreeItem) =>
    item.type === 'file' &&
    !item.path.startsWith('/uploads/tmp/') &&
    !item.path.startsWith('/uploads/resize/') &&
    !item.path.startsWith('/uploads/lossy/');

  const normalizeFolderPath = (p: string) => p.replace(/\/+$/, '') || p;

  const canDropOnFolder = (targetFolderPath: string, droppedFilePath: string): boolean => {
    const target = normalizeFolderPath(targetFolderPath);
    const sourceParent = normalizeFolderPath(dirname(droppedFilePath));
    if (target === sourceParent) return false;

    const droppedIsAssets = droppedFilePath.startsWith('/assets/images/');
    const droppedIsUploads = droppedFilePath.startsWith('/uploads/');
    const targetIsAssets = target === '/assets/images' || target.startsWith('/assets/images/');
    const targetIsUploads = target === '/uploads' || target.startsWith('/uploads/');

    if (droppedIsAssets && targetIsAssets) return true;
    if (droppedIsUploads && targetIsUploads) return true;
    if (droppedIsUploads && targetIsAssets) return true;
    return false;
  };

  const handleMoveFileRequest = (targetFolderPath: string, droppedFilePath: string) => {
    if (!canDropOnFolder(targetFolderPath, droppedFilePath)) return;
    setMoveError(null);
    setMoveConfirm({
      from: normalizeFolderPath(dirname(droppedFilePath)),
      to: normalizeFolderPath(targetFolderPath),
      filePath: droppedFilePath,
      fileName: basename(droppedFilePath),
    });
  };

  const executeConfirmedMove = async () => {
    if (!moveConfirm) return;
    setMoveError(null);
    setMoveLoading(true);
    try {
      const res = await filesService.moveTreeFile(moveConfirm.filePath, moveConfirm.to);
      setMoveError(null);
      await fetchTrees();
      setExpanded((prev) => new Set(prev).add(moveConfirm.to));
      if (selectedPath === moveConfirm.filePath) setSelectedPath(res.imageUrl);
      setMoveConfirm(null);
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
        if (
          item.type === 'file' &&
          isImagePath(item.path) &&
          !isPathExcludedFromAtlasBuilder(item.path)
        ) {
          result.push({ path: item.path, name: item.name });
        } else if (item.children && item.children.length) {
          stack.push(...item.children);
        }
      }
      return result;
    },
    [combinedTree]
  );

  /** File trong `admin-web/public/assets/images/Spritesheet` (đường dẫn web /assets/images/Spritesheet/...). */
  const spritesheetPickerFiles = useMemo(() => {
    if (!combinedTree) return [];
    const result: { path: string; name: string }[] = [];
    const stack: FileTreeItem[] = combinedTree.children ? [...combinedTree.children] : [];
    while (stack.length) {
      const item = stack.pop()!;
      if (item.type === 'file' && isImagePath(item.path)) {
        const p = item.path.replace(/\\/g, '/').toLowerCase();
        if (p.includes('/assets/images/spritesheet/')) {
          result.push({ path: item.path, name: item.name });
        }
      } else if (item.children?.length) {
        stack.push(...item.children);
      }
    }
    return result;
  }, [combinedTree]);

  /** File trong `animations` (spritesheet 192×192 / frame). */
  const animationPickerFiles = useMemo(() => {
    if (!combinedTree) return [];
    const result: { path: string; name: string }[] = [];
    const stack: FileTreeItem[] = combinedTree.children ? [...combinedTree.children] : [];
    while (stack.length) {
      const item = stack.pop()!;
      if (item.type === 'file' && isImagePath(item.path)) {
        const p = item.path.replace(/\\/g, '/').toLowerCase();
        if (p.includes('/assets/images/animations/')) {
          result.push({ path: item.path, name: item.name });
        }
      } else if (item.children?.length) {
        stack.push(...item.children);
      }
    }
    return result;
  }, [combinedTree]);

  const handleOpenAtlasBuilder = () => {
    setAtlasError(null);
    setAtlasBuilderOpen(true);
  };

  const handleAtlasCreated = () => {
    setAtlasError(null);
    void fetchAtlasList();
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
    <div
      className={cn(
        'space-y-6 p-6',
        treeExpanded && 'flex min-h-[calc(100vh-5rem)] flex-col'
      )}
    >
      <PageHeader
        title="Manager Assets"
        description="Quản lý file ảnh: xem cây thư mục và upload ảnh lên thư mục uploaded (REST + Multer)"
      />

      <motion.div
        className={cn('flex flex-col gap-6', treeExpanded && 'min-h-0 flex-1')}
        variants={fadeSlideCard}
        initial="hidden"
        animate="visible"
      >
        <motion.div
          layout
          transition={managerAssetsTreeRowLayoutTransition}
          className={cn(
            'flex w-full min-h-0 flex-col gap-6 xl:flex-row xl:items-stretch',
            treeExpanded && 'min-h-0 flex-1'
          )}
        >
        <AnimatePresence initial={false} mode="popLayout">
          {!treeExpanded && (
        <motion.div
          key={previewEnterRemountKey}
          variants={managerAssetsPreviewPanel}
          initial={previewEnterRemountKey === 0 ? false : 'hidden'}
          animate="visible"
          exit="exit"
          className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden"
        >
        <Card className="flex min-w-0 flex-1 flex-col border bg-card shadow-xl">
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
                {selectedIsImage &&
                selectedPath &&
                !hasPendingUpload &&
                (isUploadedFile(selectedPath) || isAssetsImageFile(selectedPath)) ? (
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
                        Chọn một file ở cây thư mục bên cạnh hoặc upload ảnh mới để xem preview tại đây.
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
        </motion.div>
          )}
        </AnimatePresence>

          <motion.div
            layout
            transition={managerAssetsTreeRowLayoutTransition}
            className={cn(
              'flex min-h-0 w-full flex-col',
              treeExpanded ? 'min-h-0 flex-1 xl:min-w-0 xl:w-full' : 'xl:w-[min(100%,380px)] xl:shrink-0'
            )}
          >
          <Card
            className={cn(
              'flex h-full min-h-0 w-full flex-col border bg-card shadow-xl',
              treeExpanded && 'min-h-0 flex-1'
            )}
          >
            <CardHeader className="space-y-2 pb-2">
              <div className="flex flex-row items-start justify-between gap-2">
                <CardTitle className="text-lg font-semibold tracking-tight">Cây thư mục</CardTitle>
                <div className="flex shrink-0 items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-9 w-9 shrink-0"
                    disabled={loading}
                    onClick={handleResetTree}
                    title="Tải lại cây thư mục"
                    aria-label="Tải lại cây thư mục"
                  >
                    <FontAwesomeIcon icon={faArrowsRotate} className="h-4 w-4" />
                  </Button>
                  {!treeExpanded ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="h-9 w-9 shrink-0"
                      onClick={() => setTreeExpanded(true)}
                      title="Mở rộng cây thư mục (ẩn Image preview)"
                      aria-label="Mở rộng cây thư mục"
                    >
                      <FontAwesomeIcon icon={faExpand} className="h-4 w-4" />
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="h-9 w-9 shrink-0"
                      onClick={collapseTree}
                      title="Thu nhỏ cây thư mục (hiện lại Image preview)"
                      aria-label="Thu nhỏ cây thư mục"
                    >
                      <FontAwesomeIcon icon={faCompress} className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className={cn(treeExpanded && 'flex min-h-0 flex-1 flex-col pt-0')}>
              {moveError && (
                <p className="mb-2 text-sm text-red-400">{moveError}</p>
              )}
              {moveLoading && (
                <p className="mb-2 text-sm text-amber-400">Đang di chuyển...</p>
              )}
              {loading ? (
                <p className="text-sm text-muted-foreground">Đang tải cây thư mục...</p>
              ) : combinedTree?.children ? (
                <div
                  className={cn(
                    'overflow-y-auto rounded-lg border border-border bg-muted p-2',
                    treeExpanded
                      ? 'min-h-[min(360px,calc(100vh-13rem))] max-h-[calc(100vh-9rem)] flex-1'
                      : 'min-h-[280px] max-h-[min(58vh,520px)] xl:min-h-[320px] xl:max-h-[min(62vh,620px)]'
                  )}
                >
                  {combinedTree.children.map((item) => (
                    <FileTreeNode
                      key={item.path}
                      item={item}
                      expanded={expanded}
                      onToggle={handleToggle}
                      onSelect={setSelectedPath}
                      onFileDoubleClick={
                        treeExpanded ? handleFileDoubleClickExitExpandedTree : undefined
                      }
                      onEdit={openEditModal}
                      showEditFor={showEditFor}
                      onDropOnFolder={handleMoveFileRequest}
                      canDropOnFolder={canDropOnFolder}
                    />
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Không có dữ liệu.</p>
              )}
            </CardContent>
          </Card>
          </motion.div>
        </motion.div>

        <Card className="w-full border bg-card shadow-xl">
          <CardHeader>
            <CardTitle>Atlas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              <div className="min-h-[140px] space-y-3 rounded-lg border border-dashed border-border bg-muted/40 p-4 lg:col-span-2">
      {atlasError && <p className="text-sm text-red-400">{atlasError}</p>}
                {atlasListError && <p className="text-sm text-red-400">{atlasListError}</p>}
                <div
                  className="mb-1 flex min-w-0 flex-wrap gap-0 border-b border-border"
                  role="tablist"
                  aria-label="Atlas scope"
                >
                  {(['default', 'desktop', 'mobile'] as const).map((scope) => (
                    <button
                      key={scope}
                      type="button"
                      role="tab"
                      aria-selected={atlasListScope === scope}
                      className={cn(
                        '-mb-px border-b-2 px-2 py-1.5 text-xs font-medium transition-colors',
                        atlasListScope === scope
                          ? 'border-primary text-foreground'
                          : 'border-transparent text-muted-foreground hover:text-foreground'
                      )}
                      onClick={() => setAtlasListScope(scope)}
                    >
                      {scope === 'default' ? 'root' : scope}
                    </button>
                  ))}
                </div>
                {atlasListLoading ? (
                  <p className="text-sm text-muted-foreground">Đang tải danh sách atlas…</p>
                ) : atlasList.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Chưa có cặp file .webp + .json trong{' '}
                    <span className="font-mono text-xs">
                      {atlasListScope === 'default' ? 'server/atlas' : `server/atlas/${atlasListScope}`}
                    </span>. Dùng
                    Atlas Builder hoặc (sau này) các nút animation / spritesheet.
                  </p>
                ) : (
                  <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                    {atlasList.map((entry) => (
                      <li key={entry.jsonUrl}>
                        <button
                          type="button"
                          onClick={() => setAtlasViewEntry(entry)}
                          className={cn(
                            'group flex w-full flex-col gap-1.5 rounded-lg border bg-card p-2 text-left shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                            deletingAtlasNames.has(entry.name)
                              ? 'border-red-500 bg-red-500/15 ring-1 ring-red-500/60'
                              : 'border-border hover:border-primary hover:shadow-md'
                          )}
                        >
                          <div className="relative flex aspect-square w-full items-center justify-center overflow-hidden rounded-md bg-muted">
                            <img
                              src={entry.imageUrl}
                              alt={entry.name}
                              className="max-h-full max-w-full object-contain"
                            />
                            {entry.hasAnimation && (
                              <div className="absolute right-1.5 top-1.5">
                                <div className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-semibold transition-colors border-indigo-300/60 bg-indigo-500/80 text-white shadow-sm">
                                  animation
                                </div>
                              </div>
                            )}
                          </div>
                          <span className="truncate text-center text-xs font-medium text-foreground" title={entry.name}>
                            {entry.name}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div className="flex flex-col gap-2 rounded-lg border border-border bg-muted/30 p-3">
                <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  Thao tác
                </p>
                <div className="flex flex-col gap-2">
                  <div>
                    <Button type="button" className="w-full" onClick={handleOpenAtlasBuilder}>
                      Atlas Builder
                    </Button>
                  </div>
                  <div>
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full"
                      disabled={animationPickerFiles.length === 0}
                      title={animationPickerFiles.length === 0 ? 'Chưa có ảnh trong public/assets/images/animations' : undefined}
                      onClick={() => setAtlasAnimationOpen(true)}
                    >
                      Atlas Animation
                    </Button>
                  </div>
                  <div>
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full"
                      disabled={animationPickerFiles.length === 0}
                      title={
                        animationPickerFiles.length === 0
                          ? 'Chưa có ảnh trong public/assets/images/animations'
                          : 'Chọn frame 192×192, ghép spritesheet mới'
                      }
                      onClick={() => setAnimationEditOpen(true)}
                    >
                      Animation edit
                    </Button>
                  </div>
                  <div>
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full"
                      disabled={spritesheetPickerFiles.length === 0}
                      title={
                        spritesheetPickerFiles.length === 0
                          ? 'Chưa có ảnh trong public/assets/images/Spritesheet'
                          : undefined
                      }
                      onClick={() => setSpritesheetEditOpen(true)}
                    >
                      Spritesheet edit
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {atlasViewEntry && (
        <AtlasViewModal
          entry={atlasViewEntry}
          onClose={() => setAtlasViewEntry(null)}
          onAtlasExportedToTeyvatSucceeded={() => void fetchAtlasList()}
          onDeleteRequested={(name) => {
            console.log('[AtlasDelete] onDeleteRequested', { name });
            setDeletingAtlasNames((prev) => {
              const next = new Set(prev);
              next.add(name);
              return next;
            });
          }}
          onDeleteSucceeded={(name) => {
            console.log('[AtlasDelete] onDeleteSucceeded', { name });
            setAtlasList((prev) => prev.filter((item) => item.name !== name));
            setDeletingAtlasNames((prev) => {
              const next = new Set(prev);
              next.delete(name);
              return next;
            });
          }}
          onDeleteFailed={(name) => {
            console.log('[AtlasDelete] onDeleteFailed', { name });
            setDeletingAtlasNames((prev) => {
              const next = new Set(prev);
              next.delete(name);
              return next;
            });
          }}
        />
      )}

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
                        Có thể đổi tên file trong thư mục <strong>uploaded</strong> hoặc <strong>assets/images</strong>.
                        Xóa file chỉ hỗ trợ trong <strong>uploaded</strong> hoặc <strong>cards</strong>.
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
                    {renameNameError && !editError && <p className="text-sm text-destructive">{renameNameError}</p>}
                    {editError && <p className="text-sm text-destructive">{editError}</p>}
                    <div className="flex flex-wrap gap-2">
                      <Button onClick={handleRename} disabled={editSaving || !canRename || !!renameNameError}>
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

      {uploadedDetailOpen &&
        editPath &&
        (isUploadedFile(editPath) || (isAssetsImageFile(editPath) && isImagePath(editPath))) && (
          <UploadedImageEditModal filePath={editPath} onClose={closeEditModal} onSuccess={fetchTrees} />
        )}

      {atlasBuilderOpen && createPortal(
        <AtlasBuilderModal
          images={atlasImages}
          onClose={() => setAtlasBuilderOpen(false)}
          onCreated={() => {
            handleAtlasCreated();
            setAtlasBuilderOpen(false);
          }}
        />,
        document.body
      )}

      {spritesheetEditOpen &&
        createPortal(
          <SpritesheetEditModal
            files={spritesheetPickerFiles}
            filesLoading={loading}
            onClose={() => setSpritesheetEditOpen(false)}
            onSaved={() => void fetchTrees()}
          />,
          document.body
        )}

      {atlasAnimationOpen &&
        createPortal(
          <AtlasAnimationModal
            files={animationPickerFiles}
            onClose={() => setAtlasAnimationOpen(false)}
            onCreated={() => {
              void fetchAtlasList();
              setAtlasAnimationOpen(false);
            }}
          />,
          document.body
        )}

      {animationEditOpen &&
        createPortal(
          <AnimationEditModal
            files={animationPickerFiles}
            filesLoading={loading}
            onClose={() => setAnimationEditOpen(false)}
            onSaved={() => void fetchTrees()}
          />,
          document.body
        )}

      <ImageLightbox
        open={previewLightbox}
        onClose={() => setPreviewLightbox(null)}
      />

      {moveConfirm &&
        createPortal(
          <div
            className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/60 p-4"
            onClick={() => {
              if (!moveLoading) setMoveConfirm(null);
            }}
          >
            <Card
              className="w-full max-w-lg border bg-card shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-lg">Xác nhận di chuyển file</CardTitle>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    if (!moveLoading) setMoveConfirm(null);
                  }}
                  disabled={moveLoading}
                  aria-label="Đóng"
                >
                  ✕
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3 text-sm">
                  <div className="space-y-1">
                    <p className="text-[11px] font-medium text-muted-foreground">File</p>
                    <p className="break-all font-mono text-xs text-foreground">{moveConfirm.fileName}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[11px] font-medium text-muted-foreground">Thư mục hiện tại</p>
                    <p className="break-all rounded-md border border-border bg-muted px-2 py-1.5 font-mono text-xs text-foreground">
                      {moveConfirm.from}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[11px] font-medium text-muted-foreground">Thư mục đích</p>
                    <p className="break-all rounded-md border border-border bg-muted px-2 py-1.5 font-mono text-xs text-foreground">
                      {moveConfirm.to}
                    </p>
                  </div>
                </div>
                {moveError && <p className="text-sm text-destructive">{moveError}</p>}
                <div className="flex flex-wrap gap-2">
                  <Button type="button" onClick={() => void executeConfirmedMove()} disabled={moveLoading}>
                    {moveLoading ? 'Đang di chuyển…' : 'Xác nhận di chuyển'}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setMoveConfirm(null)}
                    disabled={moveLoading}
                  >
                    Hủy
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>,
          document.body
        )}
    </div>
  );
}
