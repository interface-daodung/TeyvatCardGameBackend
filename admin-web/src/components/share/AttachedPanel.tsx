import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type SyntheticEvent,
} from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faImage, faMusic, faPlus, faTrash } from '@fortawesome/free-solid-svg-icons';
import { motion } from 'framer-motion';
import { fadeSlideCard } from '../animations/motionPresets';
import { FileTreeNode } from '../FileTreeNode';
import { ImageLightbox, type LightboxImage } from '../ui/ImageLightbox';
import type { AttachedImage } from '../../services/gameDataService';
import { filesService, type FileTreeItem } from '../../services/filesService';
import { cn } from '../../lib/utils';

function findDirChild(items: FileTreeItem[] | undefined, name: string): FileTreeItem | undefined {
  if (!items?.length) return undefined;
  const lower = name.toLowerCase();
  return items.find((n) => n.type === 'dir' && n.name.toLowerCase() === lower);
}

function stemFromWebPath(p: string): string {
  const base = p.split('/').pop() ?? 'image';
  return base.replace(/\.[^.]+$/, '') || 'image';
}

function isImageAssetPath(p: string): boolean {
  return /\.(png|jpe?g|gif|webp|svg|bmp)$/i.test(p);
}

function inferAttachedTypeFromPath(path: string): AttachedImage['type'] {
  const normalized = path.replace(/\\/g, '/').toLowerCase();
  if (normalized.includes('/assets/images/animations/')) return 'animation';
  if (normalized.includes('/assets/sounds/se/')) return 'SE';
  return 'image';
}

function normalizeAttachedByType(row: AttachedImage): AttachedImage {
  if (row.type !== 'animation') {
    return {
      ...row,
      frameRate: undefined,
      frameTotal: undefined,
    };
  }
  return {
    ...row,
    frameRate: row.frameRate && row.frameRate > 0 ? Math.floor(row.frameRate) : 10,
    frameTotal: row.frameTotal && row.frameTotal > 0 ? Math.floor(row.frameTotal) : 1,
  };
}

function getAttachedType(row: Pick<AttachedImage, 'type' | 'image'>): AttachedImage['type'] {
  return row.type ?? inferAttachedTypeFromPath(row.image ?? '');
}

/** Ảnh trong `assets/images/animations` (spritesheet hiệu ứng). */
function isAnimationsImagePath(p: string): boolean {
  const n = p.replace(/\\/g, '/').toLowerCase();
  return n.includes('/images/animations/');
}

const ANIM_SHEET_FRAME_PX = 192;
/** Khung xem trước vuông (Tailwind `w-16` / `h-16`) */
const ANIM_PREVIEW_PX = 64;

function get192SpritesheetMeta(naturalWidth: number, naturalHeight: number): {
  cols: number;
  rows: number;
  frameCount: number;
} | null {
  if (naturalWidth < ANIM_SHEET_FRAME_PX || naturalHeight < ANIM_SHEET_FRAME_PX) return null;
  if (naturalWidth % ANIM_SHEET_FRAME_PX !== 0 || naturalHeight % ANIM_SHEET_FRAME_PX !== 0) {
    return null;
  }
  const cols = naturalWidth / ANIM_SHEET_FRAME_PX;
  const rows = naturalHeight / ANIM_SHEET_FRAME_PX;
  return { cols, rows, frameCount: cols * rows };
}

/** Gần vuông (1:1) → ô vuông; mọi tỉ lệ khác → khung cố định aspect-[7/12]. */
const SQUARE_ASPECT_TOLERANCE = 0.06;

type AttachedThumbKind = 'pending' | 'square' | 'frame712';

function classifyAttachedThumbAspect(naturalWidth: number, naturalHeight: number): AttachedThumbKind {
  if (!naturalWidth || !naturalHeight) return 'frame712';
  const r = naturalWidth / naturalHeight;
  if (Math.abs(r - 1) < SQUARE_ASPECT_TOLERANCE) return 'square';
  return 'frame712';
}

function AttachedRowImageThumb({
  src,
  nameId,
  onOpenLightbox,
}: {
  src: string;
  nameId: string;
  onOpenLightbox: (payload: LightboxImage) => void;
}) {
  const [kind, setKind] = useState<AttachedThumbKind>('pending');

  useEffect(() => {
    setKind('pending');
  }, [src]);

  const onImgLoad = useCallback((e: SyntheticEvent<HTMLImageElement>) => {
    const { naturalWidth, naturalHeight } = e.currentTarget;
    setKind(classifyAttachedThumbAspect(naturalWidth, naturalHeight));
  }, []);

  const onImgError = useCallback(() => {
    setKind('square');
  }, []);

  const use712Frame = kind === 'frame712';

  return (
    <div
      className={cn(
        'relative flex shrink-0 cursor-zoom-in overflow-hidden rounded-md border border-slate-600/80 bg-slate-800 shadow-inner outline-none ring-offset-2 focus-visible:ring-2 focus-visible:ring-primary',
        use712Frame ? 'h-16 w-auto aspect-[7/12] p-0' : 'h-16 w-16 items-center justify-center p-1'
      )}
      role="button"
      tabIndex={0}
      title="Double-click hoặc Enter để xem phóng to"
      onDoubleClick={(e) => {
        e.preventDefault();
        onOpenLightbox({ src, alt: nameId });
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpenLightbox({ src, alt: nameId });
        }
      }}
    >
      <img
        src={src}
        alt=""
        onLoad={onImgLoad}
        onError={onImgError}
        className={cn(
          'pointer-events-none object-contain object-center',
          use712Frame ? 'h-full w-full' : 'max-h-full max-w-full'
        )}
      />
    </div>
  );
}

/**
 * Ảnh trong `/images/animations/` và spritesheet chia ô đúng 192×192:
 * nhãn animation, preview vuông bằng canvas (lưới frame 192px, giống `SpritesheetWrapper` / `generateFrameNumbers`).
 */
function AttachedAnimations192Preview({
  src,
  nameId,
  frameRate,
  frameTotal,
  onOpenLightbox,
}: {
  src: string;
  nameId: string;
  frameRate: number;
  frameTotal: number;
  onOpenLightbox: (payload: LightboxImage) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const metaRef = useRef<{ cols: number; rows: number; frameCount: number } | null>(null);
  const [mode, setMode] = useState<'loading' | 'canvas' | 'fallback'>('loading');

  useEffect(() => {
    setMode('loading');
    imgRef.current = null;
    metaRef.current = null;
    let cancelled = false;
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => {
      if (cancelled) return;
      const meta = get192SpritesheetMeta(img.naturalWidth, img.naturalHeight);
      imgRef.current = img;
      if (meta) {
        metaRef.current = meta;
        setMode('canvas');
      } else {
        setMode('fallback');
      }
    };
    img.onerror = () => {
      if (!cancelled) setMode('fallback');
    };
    img.src = src;
    return () => {
      cancelled = true;
    };
  }, [src]);

  useEffect(() => {
    if (mode !== 'canvas') return;
    const canvas = canvasRef.current;
    const img = imgRef.current;
    const meta = metaRef.current;
    if (!canvas || !img || !meta) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const css = ANIM_PREVIEW_PX;
    const dpr = typeof window !== 'undefined' ? Math.min(window.devicePixelRatio || 1, 2) : 1;
    canvas.style.width = `${css}px`;
    canvas.style.height = `${css}px`;
    canvas.width = Math.round(css * dpr);
    canvas.height = Math.round(css * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingEnabled = true;

    const maxPlayableFrames = Math.max(1, Math.min(frameTotal, meta.frameCount));
    let frameIdx = 0;
    const drawFrame = (index: number) => {
      const col = index % meta.cols;
      const row = Math.floor(index / meta.cols);
      ctx.clearRect(0, 0, css, css);
      ctx.drawImage(
        img,
        col * ANIM_SHEET_FRAME_PX,
        row * ANIM_SHEET_FRAME_PX,
        ANIM_SHEET_FRAME_PX,
        ANIM_SHEET_FRAME_PX,
        0,
        0,
        css,
        css
      );
    };

    drawFrame(0);
    const ms = 1000 / Math.max(1, frameRate);
    const id = window.setInterval(() => {
      frameIdx = (frameIdx + 1) % maxPlayableFrames;
      drawFrame(frameIdx);
    }, ms);

    return () => {
      clearInterval(id);
    };
  }, [frameRate, frameTotal, mode, src]);

  const openLightbox = useCallback(() => {
    onOpenLightbox({ src, alt: nameId });
  }, [src, nameId, onOpenLightbox]);

  if (mode === 'loading') {
    return (
      <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-md border border-slate-600/80 bg-slate-800 px-1 text-center text-[9px] leading-tight text-slate-400">
        Đang tải…
      </div>
    );
  }

  if (mode === 'fallback') {
    return <AttachedRowImageThumb src={src} nameId={nameId} onOpenLightbox={onOpenLightbox} />;
  }

  return (
    <div className="flex shrink-0 flex-col items-center gap-1.5">
      <span className="rounded-full border border-violet-300/80 bg-violet-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-violet-700">
        animation
      </span>
      <div
        role="button"
        tabIndex={0}
        className={cn(
          'h-16 w-16 shrink-0 cursor-zoom-in overflow-hidden rounded-md border border-slate-600/80 bg-slate-800 shadow-inner outline-none ring-offset-2 focus-visible:ring-2 focus-visible:ring-primary'
        )}
        title="Double-click hoặc Enter để xem phóng to"
        onDoubleClick={(e) => {
          e.preventDefault();
          openLightbox();
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            openLightbox();
          }
        }}
      >
        <canvas ref={canvasRef} className="block h-16 w-16 max-h-16 max-w-16" aria-hidden />
      </div>
    </div>
  );
}

type AssetPickerTab = 'skills' | 'animations' | 'soundEffects' | 'badge' | 'resonance';

function filterResonanceFiles(items: FileTreeItem[] | undefined): FileTreeItem[] {
  if (!items?.length) return [];
  const out: FileTreeItem[] = [];
  for (const item of items) {
    if (item.type === 'file') {
      if (item.name.toLowerCase().includes('resonance')) out.push(item);
      continue;
    }
    const children = filterResonanceFiles(item.children);
    if (children.length > 0) out.push({ ...item, children });
  }
  return out;
}

export interface AttachedPanelProps {
  /** `_id` — key ổn định cho input */
  entityId: string;
  attached: AttachedImage[] | undefined;
  saveLoading: boolean;
  onPersistAttached: (attached: AttachedImage[]) => void | Promise<void>;
  /** `adventureCard` / `item`: copy form + Lưu; mặc định nhân vật (lưu ngay) */
  context?: 'character' | 'adventureCard' | 'item';
  /** Bật tab badge theo loại entity cụ thể (VD: adventure card type=weapon) */
  assetType?: string;
  /** Category dùng để mở thư mục badge/category */
  assetCategory?: string;
}

export function AttachedPanel({
  entityId,
  attached: attachedProp,
  saveLoading,
  onPersistAttached,
  context = 'character',
  assetType,
  assetCategory,
}: AttachedPanelProps) {
  const attached = attachedProp ?? [];
  const panelTitle =
    context === 'character'
      ? 'Skill assets đính kèm'
      : context === 'adventureCard'
        ? 'Assets đính kèm thẻ phiêu lưu'
        : 'Assets đính kèm trang bị';
  const addButtonTooltip =
    'Chọn asset trong assets/images/skill, assets/images/animations, assets/sounds/SE (và badge nếu có). Mỗi mục: định danh nameId + đường dẫn asset.';

  const [fullImageTree, setFullImageTree] = useState<FileTreeItem[] | null>(null);
  const [soundTree, setSoundTree] = useState<FileTreeItem[] | null>(null);
  const [imageTreeLoading, setImageTreeLoading] = useState(false);
  const [soundTreeLoading, setSoundTreeLoading] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickAction, setPickAction] = useState<'add' | { index: number } | null>(null);
  const [pickerTab, setPickerTab] = useState<AssetPickerTab>('skills');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [imageLightbox, setImageLightbox] = useState<LightboxImage | null>(null);

  const skillSubtree = useMemo(() => {
    if (!fullImageTree?.length) return [];
    const skill = findDirChild(fullImageTree, 'skill');
    return skill?.children ?? [];
  }, [fullImageTree]);

  const animationsSubtree = useMemo(() => {
    if (!fullImageTree?.length) return [];
    const animations = findDirChild(fullImageTree, 'animations');
    return animations?.children ?? [];
  }, [fullImageTree]);

  const isWeaponType = (assetType ?? '').trim().toLowerCase() === 'weapon';
  const isCoinType = (assetType ?? '').trim().toLowerCase() === 'coin';
  const normalizedAssetCategory = (assetCategory ?? '').trim();

  const badgeSubtree = useMemo(() => {
    if (!isWeaponType || !normalizedAssetCategory) return [];
    if (!fullImageTree?.length) return [];
    const badgeDir = findDirChild(fullImageTree, 'badge');
    const categoryDir = findDirChild(badgeDir?.children, normalizedAssetCategory);
    return categoryDir?.children ?? [];
  }, [fullImageTree, isWeaponType, normalizedAssetCategory]);

  const resonanceSubtree = useMemo(() => {
    if (!isCoinType) return [];
    if (!fullImageTree?.length) return [];
    const cardsDir = findDirChild(fullImageTree, 'cards');
    const coinDir = findDirChild(cardsDir?.children, 'coin');
    return filterResonanceFiles(coinDir?.children);
  }, [fullImageTree, isCoinType]);

  const tabs = useMemo(
    () =>
      [
        {
          id: 'skills' as const,
          label: 'Skills',
          items: skillSubtree,
          emptyLabel: 'Không tìm thấy asset trong /assets/images/skill.',
        },
        {
          id: 'animations' as const,
          label: 'Animations',
          items: animationsSubtree,
          emptyLabel: 'Không tìm thấy asset trong /assets/images/animations.',
        },
        {
          id: 'soundEffects' as const,
          label: 'Sound Effects',
          items: soundTree ?? [],
          emptyLabel: 'Không tìm thấy asset trong /assets/sounds/SE.',
        },
        ...(isWeaponType
          ? [
              {
                id: 'badge' as const,
                label: 'Badge',
                items: badgeSubtree,
                emptyLabel: normalizedAssetCategory
                  ? `Không tìm thấy asset trong /assets/images/badge/${normalizedAssetCategory}.`
                  : 'Không tìm thấy category cho badge.',
              },
            ]
          : []),
        ...(isCoinType
          ? [
              {
                id: 'resonance' as const,
                label: 'Resonance',
                items: resonanceSubtree,
                emptyLabel: 'Không tìm thấy file resonance trong /assets/images/cards/coin.',
              },
            ]
          : []),
      ] satisfies Array<{ id: AssetPickerTab; label: string; items: FileTreeItem[]; emptyLabel: string }>,
    [
      animationsSubtree,
      badgeSubtree,
      isCoinType,
      isWeaponType,
      normalizedAssetCategory,
      resonanceSubtree,
      skillSubtree,
      soundTree,
    ]
  );

  const activeTab = tabs.find((tab) => tab.id === pickerTab) ?? tabs[0];
  useEffect(() => {
    if (tabs.some((tab) => tab.id === pickerTab)) return;
    setPickerTab('skills');
  }, [pickerTab, tabs]);

  const pickerLoading = imageTreeLoading || soundTreeLoading;

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

  useEffect(() => {
    let cancelled = false;
    setSoundTreeLoading(true);
    filesService
      .getImageTree('sound-effects')
      .then((t) => {
        if (!cancelled) setSoundTree(t);
      })
      .catch(() => {
        if (!cancelled) setSoundTree([]);
      })
      .finally(() => {
        if (!cancelled) setSoundTreeLoading(false);
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
    setPickerTab('skills');
  };

  const onSelectFile = async (path: string) => {
    if (!path || !pickAction) return;
    const base = attachedProp ?? [];
    const inferredType = inferAttachedTypeFromPath(path);
    if (pickAction === 'add') {
      const nameId = stemFromWebPath(path);
      const newAttached = normalizeAttachedByType({
        nameId,
        image: path,
        type: inferredType,
      });
      await onPersistAttached([...base, newAttached]);
    } else {
      const i = pickAction.index;
      const next = base.map((a, j) =>
        j === i
          ? normalizeAttachedByType({
              ...a,
              image: path,
              type: inferredType,
            })
          : a
      );
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

  const commitFrameRate = async (index: number, raw: string) => {
    const parsed = Math.max(1, Math.floor(Number(raw) || 0));
    const base = attachedProp ?? [];
    const next = base.map((a, j) =>
      j === index && getAttachedType(a) === 'animation' ? normalizeAttachedByType({ ...a, frameRate: parsed }) : a
    );
    await onPersistAttached(next);
  };

  const commitFrameTotal = async (index: number, raw: string) => {
    const parsed = Math.max(1, Math.floor(Number(raw) || 0));
    const base = attachedProp ?? [];
    const next = base.map((a, j) =>
      j === index && getAttachedType(a) === 'animation' ? normalizeAttachedByType({ ...a, frameTotal: parsed }) : a
    );
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
        <h3 className="text-sm font-semibold text-slate-900">{panelTitle}</h3>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => openPickerAdd()}
            disabled={saveLoading}
            title={addButtonTooltip}
            aria-label={`Thêm asset. ${addButtonTooltip}`}
            className={cn(
              'inline-flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary',
              'hover:bg-primary/15 disabled:pointer-events-none disabled:opacity-50'
            )}
          >
            <FontAwesomeIcon icon={faPlus} className="h-3.5 w-3.5" aria-hidden />
            Chọn asset
          </button>
          {saveLoading && (
            <span className="text-xs text-muted-foreground">Đang lưu…</span>
          )}
        </div>
      </div>

      <div className="relative min-h-0 flex-1 overflow-y-auto px-3 py-3 md:px-4">
        {attached.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Chưa có asset đính kèm. Nhấn &quot;Chọn asset&quot; để chọn từ Skills, Animations, Sound Effects
            {isWeaponType && isCoinType
              ? ', Badge hoặc Resonance.'
              : isWeaponType
                ? ' hoặc Badge.'
                : isCoinType
                  ? ' hoặc Resonance.'
                  : '.'}
          </p>
        ) : (
          <ul className="space-y-3">
            {attached.map((row, index) => {
              const rowType = getAttachedType(row);
              return (
              <li
                key={`${row.nameId}-${index}`}
                className="flex flex-wrap items-start gap-3 rounded-lg border border-slate-100 bg-slate-50/80 p-3"
              >
                {row.image?.trim() && isImageAssetPath(row.image) ? (
                  rowType === 'animation' && isAnimationsImagePath(row.image.trim()) ? (
                    <AttachedAnimations192Preview
                      src={row.image.trim()}
                      nameId={row.nameId}
                      frameRate={row.frameRate ?? 10}
                      frameTotal={row.frameTotal ?? 1}
                      onOpenLightbox={setImageLightbox}
                    />
                  ) : (
                    <AttachedRowImageThumb
                      src={row.image.trim()}
                      nameId={row.nameId}
                      onOpenLightbox={setImageLightbox}
                    />
                  )
                ) : (
                  <div className="relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-md border border-slate-200 bg-white">
                    {row.image?.trim() ? (
                      <div className="flex h-full w-full flex-col items-center justify-center gap-1 text-[10px] text-muted-foreground">
                        <FontAwesomeIcon icon={faMusic} className="h-4 w-4" aria-hidden />
                        <span className="px-1 text-center leading-tight">Audio</span>
                      </div>
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-[10px] text-muted-foreground">
                        —
                      </div>
                    )}
                  </div>
                )}
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
                    {row.image || 'Chưa chọn asset'}
                  </p>
                  {rowType === 'animation' && (
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      <label className="block text-[11px] font-medium text-slate-600">
                        frameRate
                        <input
                          type="number"
                          min={1}
                          step={1}
                          defaultValue={row.frameRate ?? 10}
                          key={`${entityId}-att-fr-${index}-${row.frameRate ?? 10}`}
                          disabled={saveLoading}
                          onBlur={(e) => void commitFrameRate(index, e.target.value)}
                          className="mt-0.5 w-full rounded border border-slate-200 bg-white px-2 py-1 text-xs text-slate-900"
                        />
                      </label>
                      <label className="block text-[11px] font-medium text-slate-600">
                        frameTotal
                        <input
                          type="number"
                          min={1}
                          step={1}
                          defaultValue={row.frameTotal ?? 1}
                          key={`${entityId}-att-ft-${index}-${row.frameTotal ?? 1}`}
                          disabled={saveLoading}
                          onBlur={(e) => void commitFrameTotal(index, e.target.value)}
                          className="mt-0.5 w-full rounded border border-slate-200 bg-white px-2 py-1 text-xs text-slate-900"
                        />
                      </label>
                    </div>
                  )}
                  {row.image?.trim() && rowType === 'SE' && (
                    <audio controls preload="none" className="h-8 w-full min-w-0">
                      <source src={row.image} />
                    </audio>
                  )}
                </div>
                <div className="flex shrink-0 flex-col gap-1.5 sm:flex-row">
                  <button
                    type="button"
                    title="Đổi asset"
                    aria-label="Đổi asset"
                    disabled={saveLoading}
                    onClick={() => openPickerForRow(index)}
                    className="inline-flex items-center justify-center rounded-md border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-700 hover:bg-slate-100 disabled:opacity-50"
                  >
                    <FontAwesomeIcon
                      icon={rowType === 'SE' ? faMusic : faImage}
                      className="h-3.5 w-3.5"
                      aria-hidden
                    />
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
            )})}
          </ul>
        )}
      </div>

      {pickerOpen && (
        <div className="absolute inset-0 z-20 flex flex-col overflow-hidden bg-white">
          <div className="flex shrink-0 items-center justify-between border-b border-border bg-muted px-3 py-2 text-xs font-medium">
            <span className="truncate pr-2">
              Chọn asset
            </span>
            <button
              type="button"
              onClick={closePicker}
              className="shrink-0 rounded px-2 py-1 hover:bg-muted-foreground/15"
            >
              Đóng
            </button>
          </div>
          <div className="shrink-0 border-b border-border/70 px-3 pt-2">
            <div className="flex min-w-0 flex-wrap gap-0" role="tablist" aria-label="Nguồn asset">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={pickerTab === tab.id}
                  className={cn(
                    '-mb-px border-b-2 px-3 py-2 text-xs font-medium transition-colors',
                    pickerTab === tab.id
                      ? 'border-primary text-foreground'
                      : 'border-transparent text-muted-foreground hover:text-foreground'
                  )}
                  onClick={() => setPickerTab(tab.id)}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto p-2 text-xs">
            {pickerLoading ? (
              <p className="text-muted-foreground">Đang tải cây asset…</p>
            ) : activeTab.items.length > 0 ? (
              <div className="space-y-3">
                {pickerTab !== 'soundEffects' && (
                  <p className="font-medium text-muted-foreground">
                    <code className="text-[11px] text-foreground">
                      {pickerTab === 'skills'
                        ? '/assets/images/skill'
                        : pickerTab === 'animations'
                          ? '/assets/images/animations'
                          : pickerTab === 'resonance'
                            ? '/assets/images/cards/coin (lọc tên chứa resonance)'
                          : `/assets/images/badge/${normalizedAssetCategory}`}
                    </code>
                  </p>
                )}
                {activeTab.items.map((item) => (
                  <FileTreeNode
                    key={item.path}
                    item={item}
                    expanded={expanded}
                    onToggle={toggleExpanded}
                    onSelect={onSelectFile}
                  />
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground">{activeTab.emptyLabel}</p>
            )}
          </div>
        </div>
      )}

      <ImageLightbox
        open={imageLightbox}
        onClose={() => setImageLightbox(null)}
        smallAssetLightbox
      />
    </motion.div>
  );
}
