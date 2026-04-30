import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { filesService } from '../../services/filesService';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { cn } from '../../lib/utils';
import {
  classifyAtlasImageKind,
  type AtlasImageKind,
} from './atlasImageKind';
import { JsonRawHighlight } from './JsonRawHighlight';
import { AssetLoadingOverlay } from './AssetLoadingOverlay';
import { buildSimulatedAtlasMetadata, drawImageCover } from './atlasPreviewUtils';
import { gameDataService } from '../../services/gameDataService';

interface AtlasImageItem {
  path: string;
  name: string;
}

type AvailableTab = 'card' | 'item' | 'other';

/** Tab vùng Ảnh trong atlas: collection = kéo thả; preview/json = giả lập giống server. */
type AtlasPanelTab = 'collection' | 'preview' | 'json';

interface AtlasBuilderModalProps {
  images: AtlasImageItem[];
  onClose: () => void;
  onCreated: (result: {
    imageUrl: string;
    jsonUrl: string;
    count: number;
    sheetSize: { w: number; h: number };
  }) => void;
  /** Pre-fill atlas name (e.g. when opened from map form). Must match server validation if used as-is. */
  initialAtlasName?: string;
  /** Pre-select these image paths in the collection (paths must exist in `images`). */
  initialSelectedPaths?: string[];
}

function recordDims(
  path: string,
  w: number,
  h: number,
  setDims: React.Dispatch<
    React.SetStateAction<Record<string, { w: number; h: number }>>
  >
) {
  setDims((prev) => {
    if (prev[path]?.w === w && prev[path]?.h === h) return prev;
    return { ...prev, [path]: { w, h } };
  });
}

export function AtlasBuilderModal({
  images,
  onClose,
  onCreated,
  initialAtlasName,
  initialSelectedPaths,
}: AtlasBuilderModalProps) {
  const [selected, setSelected] = useState<string[]>(() => {
    if (!initialSelectedPaths?.length) return [];
    return initialSelectedPaths.filter((p) => images.some((i) => i.path === p));
  });
  const [dims, setDims] = useState<Record<string, { w: number; h: number }>>({});
  const [availableTab, setAvailableTab] = useState<AvailableTab>('card');
  const [name, setName] = useState(initialAtlasName ?? '');
  const [submitting, setSubmitting] = useState(false);
  const [loadingCardsPreset, setLoadingCardsPreset] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [atlasNameEnterError, setAtlasNameEnterError] = useState<string | null>(null);
  const [atlasPanelTab, setAtlasPanelTab] = useState<AtlasPanelTab>('collection');
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const previewWrapRef = useRef<HTMLDivElement>(null);

  const addAllShortcutHint =
    'Shortcut: Ctrl/Cmd + Enter to add all images in the current tab.\n' +
    'Only works in Collection panel and does not apply to the Other tab.';

  const dimsRef = useRef(dims);
  dimsRef.current = dims;

  /** Đọc kích thước từng ảnh lần lượt để số tab cập nhật mà không chặn UI */
  useEffect(() => {
    if (images.length === 0) return;
    let cancelled = false;
    let idx = 0;
    const tick = () => {
      if (cancelled) return;
      while (idx < images.length) {
        const path = images[idx].path;
        idx += 1;
        if (dimsRef.current[path]) continue;
        const im = new Image();
        im.crossOrigin = 'anonymous';
        im.onload = () => {
          if (!cancelled) {
            recordDims(path, im.naturalWidth, im.naturalHeight, setDims);
          }
        };
        im.onerror = () => {};
        im.src = path;
        break;
      }
      if (idx < images.length && !cancelled) {
        requestAnimationFrame(tick);
      }
    };
    const id = requestAnimationFrame(tick);
    return () => {
      cancelled = true;
      cancelAnimationFrame(id);
    };
  }, [images]);

  const ensureDims = useCallback(
    (path: string): Promise<{ w: number; h: number }> => {
      const existing = dims[path];
      if (existing) return Promise.resolve(existing);
      return new Promise((resolve, reject) => {
        const im = new Image();
        im.crossOrigin = 'anonymous';
        im.onload = () => {
          const w = im.naturalWidth;
          const h = im.naturalHeight;
          recordDims(path, w, h, setDims);
          resolve({ w, h });
        };
        im.onerror = () => reject(new Error('Cannot load image'));
        im.src = path;
      });
    },
    [dims]
  );

  const firstAtlasKind = useMemo((): AtlasImageKind | null => {
    for (const path of selected) {
      const d = dims[path];
      if (d) return classifyAtlasImageKind(d.w, d.h);
    }
    return null;
  }, [selected, dims]);

  const tabsLocked = selected.length > 0;

  const canSelectTab = useCallback(
    (tab: AvailableTab): boolean => {
      if (!tabsLocked) return true;
      if (firstAtlasKind === null) {
        return tab === availableTab;
      }
      if (firstAtlasKind === 'card') return tab === 'card';
      if (firstAtlasKind === 'square') return tab === 'item';
      return tab === availableTab;
    },
    [tabsLocked, firstAtlasKind, availableTab]
  );

  useEffect(() => {
    if (selected.length === 0) return;
    if (firstAtlasKind === 'card' && availableTab !== 'card') {
      setAvailableTab('card');
    } else if (firstAtlasKind === 'square' && availableTab !== 'item') {
      setAvailableTab('item');
    }
  }, [selected.length, firstAtlasKind, availableTab]);

  const tabCounts = useMemo(() => {
    let card = 0;
    let item = 0;
    let other = 0;
    let pending = 0;
    for (const img of images) {
      const d = dims[img.path];
      if (!d) {
        pending++;
        continue;
      }
      const k = classifyAtlasImageKind(d.w, d.h);
      if (k === 'card') card++;
      else if (k === 'square') item++;
      else other++;
    }
    return { card, item, other, pending };
  }, [images, dims]);

  const availableByTab = useMemo(() => {
    const card: AtlasImageItem[] = [];
    const item: AtlasImageItem[] = [];
    const other: AtlasImageItem[] = [];
    for (const img of images) {
      if (selected.includes(img.path)) continue;
      const d = dims[img.path];
      if (!d) {
        other.push(img);
        continue;
      }
      const k = classifyAtlasImageKind(d.w, d.h);
      if (k === 'card') card.push(img);
      else if (k === 'square') item.push(img);
      else other.push(img);
    }
    return { card, item, other };
  }, [images, selected, dims]);

  const listForActiveTab = useMemo(() => {
    if (availableTab === 'card') return availableByTab.card;
    if (availableTab === 'item') return availableByTab.item;
    return availableByTab.other;
  }, [availableTab, availableByTab]);

  /** JSON + lưới giả lập giống `generateCustomAtlas` (server `filesService.ts`). */
  const simulatedAtlas = useMemo(
    () => buildSimulatedAtlasMetadata(selected, (p) => dims[p], name),
    [selected, dims, name]
  );

  useEffect(() => {
    if (atlasPanelTab !== 'preview') return;
    const canvas = previewCanvasRef.current;
    const wrap = previewWrapRef.current;
    if (!canvas || !wrap) return;

    let cancelled = false;

    const run = async () => {
      const sim = buildSimulatedAtlasMetadata(selected, (p) => dims[p], name);
      if (!sim || selected.length === 0) {
        if (cancelled) return;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          canvas.width = 2;
          canvas.height = 2;
          ctx.clearRect(0, 0, 2, 2);
        }
        return;
      }
      const { grid, spriteWidth, spriteHeight } = sim;
      const { sheetWidth, sheetHeight } = grid;

      const imgs = await Promise.all(
        selected.map(
          (path) =>
            new Promise<HTMLImageElement | null>((resolve) => {
              const im = new Image();
              im.crossOrigin = 'anonymous';
              im.onload = () => resolve(im);
              im.onerror = () => resolve(null);
              im.src = path;
            })
        )
      );
      if (cancelled) return;

      const maxDisplayW = Math.max(1, wrap.clientWidth);
      const maxDisplayH = 280;
      const fit = Math.min(
        1,
        maxDisplayW / sheetWidth,
        maxDisplayH / sheetHeight
      );
      const cw = Math.max(1, Math.floor(sheetWidth * fit));
      const ch = Math.max(1, Math.floor(sheetHeight * fit));

      canvas.width = cw;
      canvas.height = ch;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.clearRect(0, 0, cw, ch);
      ctx.save();
      ctx.scale(fit, fit);

      ctx.fillStyle = 'rgba(0,0,0,0.06)';
      ctx.fillRect(0, 0, sheetWidth, sheetHeight);

      for (let index = 0; index < selected.length; index++) {
        const im = imgs[index];
        if (!im?.naturalWidth) continue;
        const row = Math.floor(index / grid.columns);
        const col = index % grid.columns;
        const x = col * spriteWidth;
        const y = row * spriteHeight;
        drawImageCover(ctx, im, x, y, spriteWidth, spriteHeight);
      }

      ctx.strokeStyle = 'rgba(255,255,255,0.2)';
      ctx.lineWidth = 1 / Math.max(fit, 0.0001);
      for (let c = 0; c <= grid.columns; c++) {
        const gx = c * spriteWidth;
        ctx.beginPath();
        ctx.moveTo(gx, 0);
        ctx.lineTo(gx, sheetHeight);
        ctx.stroke();
      }
      for (let r = 0; r <= grid.rows; r++) {
        const gy = r * spriteHeight;
        ctx.beginPath();
        ctx.moveTo(0, gy);
        ctx.lineTo(sheetWidth, gy);
        ctx.stroke();
      }
      ctx.restore();
    };

    void run();
    const ro = new ResizeObserver(() => {
      void run();
    });
    ro.observe(wrap);
    return () => {
      cancelled = true;
      ro.disconnect();
    };
  }, [atlasPanelTab, selected, dims, name]);

  const handleAdd = useCallback(
    async (path: string) => {
      if (selected.includes(path)) return;
      let d: { w: number; h: number };
      try {
        d = await ensureDims(path);
      } catch {
        return;
      }
      const kind = classifyAtlasImageKind(d.w, d.h);
      if (kind !== 'card' && kind !== 'square') return;

      if (selected.length > 0) {
        const d0 = await ensureDims(selected[0]);
        const atlas0 = classifyAtlasImageKind(d0.w, d0.h);
        if (atlas0 !== kind) return;
      }

      setSelected((prev) => (prev.includes(path) ? prev : [...prev, path]));
    },
    [selected, ensureDims]
  );

  const handleRemove = (path: string) => {
    setSelected((prev) => prev.filter((p) => p !== path));
  };

  const handleClearAtlas = () => {
    setSelected([]);
  };

  const normalizePath = (value: string) =>
    value.trim().replace(/\\/g, '/').replace(/^https?:\/\/[^/]+/i, '');

  const getBasename = (value: string) => {
    const normalized = normalizePath(value);
    const idx = normalized.lastIndexOf('/');
    return idx >= 0 ? normalized.slice(idx + 1).toLowerCase() : normalized.toLowerCase();
  };

  const handleApplyCardsPreset = useCallback(async () => {
    try {
      setLoadingCardsPreset(true);
      setError(null);
      const cards = await gameDataService.getAdventureCards();
      const normalizedImageMap = new Map<string, string>();
      const basenameImageMap = new Map<string, string>();

      for (const img of images) {
        const normalized = normalizePath(img.path);
        normalizedImageMap.set(normalized, img.path);
        const basename = getBasename(normalized);
        if (!basenameImageMap.has(basename)) {
          basenameImageMap.set(basename, img.path);
        }
      }

      const matchedPaths: string[] = [];
      for (const card of cards) {
        if (!card.image) continue;
        const normalizedCardImage = normalizePath(card.image);
        const byFullPath = normalizedImageMap.get(normalizedCardImage);
        const byBasename = basenameImageMap.get(getBasename(normalizedCardImage));
        const resolvedPath = byFullPath ?? byBasename;
        if (resolvedPath) {
          matchedPaths.push(resolvedPath);
        }
      }

      const uniqueMatchedPaths = Array.from(new Set(matchedPaths));
      if (uniqueMatchedPaths.length === 0) {
        setError('No matching card images found to add into atlas.');
        return;
      }

      setSelected(uniqueMatchedPaths);
      setName('cards');
      setAvailableTab('card');
      setAtlasPanelTab('collection');
      setAtlasNameEnterError(null);
    } catch {
      setError('Failed to load card list.');
    } finally {
      setLoadingCardsPreset(false);
    }
  }, [images]);

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const path = e.dataTransfer.getData('text/plain');
    if (path) {
      void handleAdd(path);
    }
  };

  const handleTabClick = (tab: AvailableTab) => {
    if (!canSelectTab(tab)) return;
    setAvailableTab(tab);
  };

  const handleAddAllFromActiveTab = useCallback(async () => {
    if (availableTab === 'other') return;
    if (listForActiveTab.length === 0) return;

    let baseKind: AtlasImageKind | null = null;
    if (selected.length > 0) {
      try {
        const d0 = await ensureDims(selected[0]);
        const atlas0 = classifyAtlasImageKind(d0.w, d0.h);
        if (atlas0 === 'card' || atlas0 === 'square') {
          baseKind = atlas0;
        } else {
          return;
        }
      } catch {
        return;
      }
    }

    const acceptedPaths: string[] = [];
    for (const img of listForActiveTab) {
      try {
        const d = await ensureDims(img.path);
        const kind = classifyAtlasImageKind(d.w, d.h);
        if (kind !== 'card' && kind !== 'square') continue;
        if (baseKind && kind !== baseKind) continue;
        acceptedPaths.push(img.path);
      } catch {
        // Skip unreadable image and continue collecting others.
      }
    }

    if (acceptedPaths.length === 0) return;
    setSelected((prev) => {
      const existing = new Set(prev);
      const dedupedToAdd = acceptedPaths.filter((path) => !existing.has(path));
      return dedupedToAdd.length > 0 ? [...prev, ...dedupedToAdd] : prev;
    });
  }, [availableTab, listForActiveTab, selected, ensureDims]);

  const isValidName = /^[a-zA-Z0-9_-]{1,50}$/.test(name.trim());
  const canSubmit = isValidName && selected.length > 0 && !submitting;

  const handleAtlasNameKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setAtlasNameEnterError('Enter atlas name.');
      return;
    }
    if (!/^[a-zA-Z0-9_-]{1,50}$/.test(trimmed)) {
      setAtlasNameEnterError(
        'Name can only include Latin letters (a-z, A-Z), numbers, hyphen (-), and underscore (_), max 50 characters.'
      );
      return;
    }
    setAtlasNameEnterError(null);
    void handleCreate();
  };

  const handleCreate = async () => {
    const trimmed = name.trim();
    if (!trimmed || !isValidName) {
      setError('Invalid atlas name (only a-z, A-Z, 0-9, -, _)');
      return;
    }
    if (selected.length === 0) {
      setError('Please select at least one image to create atlas.');
      return;
    }
    try {
      setSubmitting(true);
      setError(null);
      setAtlasNameEnterError(null);
      const result = await filesService.generateCustomAtlas(selected, trimmed);
      onCreated(result);
      onClose();
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { error?: string } } }).response?.data?.error
          : 'Create atlas failed';
      setError(msg || 'Create atlas failed');
    } finally {
      setSubmitting(false);
    }
  };

  const tabLockTitle =
    tabsLocked && firstAtlasKind === null
      ? 'Detecting image type in atlas - do not switch tabs until loading completes'
      : tabsLocked && firstAtlasKind === 'card'
        ? 'Atlas is using card images (7:12) - only Card tab is available or clear all images (undo button)'
        : tabsLocked && firstAtlasKind === 'square'
          ? 'Atlas is using square images - only Item tab is available or clear all images'
          : undefined;

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) || e.key !== 'Enter') return;
      if (availableTab === 'other') return;
      if (atlasPanelTab !== 'collection') return;
      e.preventDefault();
      void handleAddAllFromActiveTab();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [availableTab, atlasPanelTab, handleAddAllFromActiveTab]);

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 p-4"
      onClick={() => {
        if (!submitting) onClose();
      }}
    >
      <Card
        className="relative w-full max-w-5xl border bg-card shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        aria-busy={submitting}
      >
        <div aria-hidden={submitting}>
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <div>
            <CardTitle className="text-lg font-semibold tracking-tight">
              Create custom atlas
            </CardTitle>
          </div>
          <Button variant="ghost" size="sm" type="button" disabled={submitting} onClick={onClose}>
            ✕
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-4 md:flex-row">
            <div className="flex-1 min-w-0">
              <label className="mb-1 block text-sm font-medium">
                Images in atlas ({selected.length})
              </label>
              <div className="mb-2 flex flex-wrap items-end justify-between gap-x-2 gap-y-1 border-b border-border">
                <div
                  className="flex min-w-0 flex-wrap gap-0"
                  role="tablist"
                  aria-label="Images in atlas"
                >
                  <button
                    type="button"
                    role="tab"
                    aria-selected={atlasPanelTab === 'collection'}
                    className={cn(
                      '-mb-px border-b-2 px-2 py-1.5 text-xs font-medium transition-colors',
                      atlasPanelTab === 'collection'
                        ? 'border-primary text-foreground'
                        : 'border-transparent text-muted-foreground hover:text-foreground'
                    )}
                    onClick={() => setAtlasPanelTab('collection')}
                  >
                    Collection
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={atlasPanelTab === 'preview'}
                    className={cn(
                      '-mb-px border-b-2 px-2 py-1.5 text-xs font-medium transition-colors',
                      atlasPanelTab === 'preview'
                        ? 'border-primary text-foreground'
                        : 'border-transparent text-muted-foreground hover:text-foreground'
                    )}
                    onClick={() => setAtlasPanelTab('preview')}
                  >
                    Preview
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={atlasPanelTab === 'json'}
                    className={cn(
                      '-mb-px border-b-2 px-2 py-1.5 text-xs font-medium transition-colors',
                      atlasPanelTab === 'json'
                        ? 'border-primary text-foreground'
                        : 'border-transparent text-muted-foreground hover:text-foreground'
                    )}
                    onClick={() => setAtlasPanelTab('json')}
                  >
                    JSON
                  </button>
                </div>
                <div className="ml-auto flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    title="Get all images from cards list"
                    disabled={loadingCardsPreset || submitting}
                    onClick={() => {
                      void handleApplyCardsPreset();
                    }}
                    className={cn(
                      '-mb-px shrink-0 border-b-2 border-transparent px-2 py-1.5 text-xs font-medium transition-colors text-muted-foreground hover:text-foreground',
                      (loadingCardsPreset || submitting) && 'cursor-not-allowed opacity-50'
                    )}
                  >
                    {loadingCardsPreset ? 'cards...' : 'cards'}
                  </button>
                  <button
                    type="button"
                    title="Clear all atlas images to switch tabs"
                    disabled={selected.length === 0 || loadingCardsPreset || submitting}
                    onClick={handleClearAtlas}
                    className={cn(
                      '-mb-px shrink-0 border-b-2 border-transparent px-2 py-1.5 text-xs font-medium transition-colors text-muted-foreground hover:text-foreground',
                      (selected.length === 0 || loadingCardsPreset || submitting) &&
                        'cursor-not-allowed opacity-50'
                    )}
                  >
                    reset
                  </button>
                </div>
              </div>

              <div
                className={cn(
                  'h-[320px] rounded-lg overflow-hidden flex flex-col min-w-0',
                  atlasPanelTab === 'collection'
                    ? 'border border-dashed border-border bg-muted'
                    : 'border border-border bg-muted/50'
                )}
              >
                {atlasPanelTab === 'collection' && (
                  <div
                    className="flex-1 min-h-0 overflow-y-auto p-3 flex flex-wrap gap-2 content-start"
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={handleDrop}
                  >
                    {selected.length === 0 && (
                      <p className="text-xs text-muted-foreground">
                        Drag images from the list on the right or click to add.
                      </p>
                    )}
                    {selected.map((path) => {
                      const img = images.find((i) => i.path === path);
                      if (!img) return null;
                      return (
                        <div
                          key={path}
                          className="relative w-20 h-28 rounded-md border border-border bg-background overflow-hidden flex flex-col"
                        >
                          <div className="relative h-20 w-full">
                            <img
                              src={img.path}
                              alt={img.name}
                              className="w-full h-full object-cover object-top"
                            />
                            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 via-black/40 to-transparent px-1 py-0.5">
                              <span className="block truncate text-[10px] text-white">
                                {img.name}
                              </span>
                            </div>
                          </div>
                          <button
                            type="button"
                            className="absolute right-1 top-1 rounded-full bg-black/60 px-1 text-[10px] text-white"
                            onClick={() => handleRemove(path)}
                          >
                            ✕
                          </button>
                          <span className="mt-auto truncate px-1 pb-1 text-[10px] text-muted-foreground">
                            {img.path}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}

                {atlasPanelTab === 'preview' && (
                  <div
                    ref={previewWrapRef}
                    className="flex flex-1 min-h-0 flex-col items-center justify-center overflow-auto p-2"
                  >
                    {selected.length === 0 ? (
                      <p className="text-xs text-muted-foreground px-2 text-center">
                        Add images to the collection to preview the sprite sheet (same grid and
                        cover algorithm as server).
                      </p>
                    ) : !simulatedAtlas ? (
                      <p className="text-xs text-muted-foreground px-2 text-center">
                        Loading first image dimensions to calculate grid...
                      </p>
                    ) : (
                      <canvas
                        ref={previewCanvasRef}
                        className="max-h-[280px] w-auto max-w-full rounded border border-border bg-black/20"
                        aria-label="Simulated atlas preview"
                      />
                    )}
                  </div>
                )}

                {atlasPanelTab === 'json' && (
                  <div className="flex flex-1 min-h-0 flex-col overflow-hidden p-2">
                    {selected.length === 0 ? (
                      <p className="text-xs text-muted-foreground">
                        No images yet — JSON will match the .json file when creating atlas (simulated).
                      </p>
                    ) : !simulatedAtlas ? (
                      <p className="text-xs text-muted-foreground">
                        First image dimensions are required to build meta.size and frames.
                      </p>
                    ) : (
                      <JsonRawHighlight
                        data={simulatedAtlas.metadata}
                        className="!max-h-[280px]"
                      />
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="w-full md:w-72 shrink-0">
              <div className="mb-1 flex items-center gap-2">
                <label className="block text-sm font-medium">
                  Available images ({images.length})
                </label>
                <button
                  type="button"
                  className="rounded border border-border bg-background px-1.5 py-0.5 text-[11px] text-muted-foreground hover:text-foreground"
                  title={addAllShortcutHint}
                  aria-label="Shortcut hints"
                >
                  ?
                </button>
              </div>
              <div
                className="flex flex-wrap gap-0 border-b border-border mb-2"
                role="tablist"
                aria-label="Filter images by type"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={availableTab === 'card'}
                  disabled={!canSelectTab('card')}
                  title={tabLockTitle ? `${tabLockTitle}\n\n${addAllShortcutHint}` : addAllShortcutHint}
                  className={cn(
                    '-mb-px border-b-2 px-2 py-1.5 text-xs font-medium transition-colors',
                    availableTab === 'card'
                      ? 'border-primary text-foreground'
                      : 'border-transparent text-muted-foreground hover:text-foreground',
                    !canSelectTab('card') && 'cursor-not-allowed opacity-50'
                  )}
                  onClick={() => handleTabClick('card')}
                >
                  Card ({tabCounts.card})
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={availableTab === 'item'}
                  disabled={!canSelectTab('item')}
                  title={tabLockTitle ? `${tabLockTitle}\n\n${addAllShortcutHint}` : addAllShortcutHint}
                  className={cn(
                    '-mb-px border-b-2 px-2 py-1.5 text-xs font-medium transition-colors',
                    availableTab === 'item'
                      ? 'border-primary text-foreground'
                      : 'border-transparent text-muted-foreground hover:text-foreground',
                    !canSelectTab('item') && 'cursor-not-allowed opacity-50'
                  )}
                  onClick={() => handleTabClick('item')}
                >
                  Item ({tabCounts.item})
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={availableTab === 'other'}
                  disabled={!canSelectTab('other')}
                  title={tabLockTitle}
                  className={cn(
                    '-mb-px border-b-2 px-2 py-1.5 text-xs font-medium transition-colors',
                    availableTab === 'other'
                      ? 'border-primary text-foreground'
                      : 'border-transparent text-muted-foreground hover:text-foreground',
                    !canSelectTab('other') && 'cursor-not-allowed opacity-50'
                  )}
                  onClick={() => handleTabClick('other')}
                >
                  Other ({tabCounts.other}
                  {tabCounts.pending > 0 ? ` +${tabCounts.pending}` : ''})
                </button>
              </div>

              <div className="max-h-[320px] overflow-y-auto rounded-lg border border-border bg-muted/40 p-2">
                {listForActiveTab.length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    {availableTab === 'other'
                      ? 'No images in this section.'
                      : 'No remaining images of this type outside atlas.'}
                  </p>
                )}
                <div className="grid grid-cols-3 gap-2">
                  {listForActiveTab.map((img) => {
                    const d = dims[img.path];
                    const isReadOnly =
                      availableTab === 'other' || !d || classifyAtlasImageKind(d.w, d.h) === 'other';
                    const isItemTab = availableTab === 'item';
                    const isCardTab = availableTab === 'card';
                    const fixedAspectCell = isItemTab || isCardTab;
                    return (
                      <div
                        key={img.path}
                        className={cn(
                          'group rounded-md border border-border bg-muted overflow-hidden',
                          fixedAspectCell && 'relative',
                          isItemTab && 'aspect-square',
                          isCardTab && 'aspect-[7/12]',
                          !fixedAspectCell && 'flex flex-col',
                          isReadOnly
                            ? 'cursor-default opacity-75'
                            : 'cursor-pointer hover:ring-2 hover:ring-primary/60'
                        )}
                        draggable={!isReadOnly}
                        onDragStart={(e) => {
                          if (isReadOnly) {
                            e.preventDefault();
                            return;
                          }
                          e.dataTransfer.setData('text/plain', img.path);
                        }}
                        onClick={() => {
                          if (isReadOnly) return;
                          void handleAdd(img.path);
                        }}
                      >
                        <img
                          src={img.path}
                          alt={img.name}
                          className={cn(
                            'w-full object-cover object-top',
                            fixedAspectCell
                              ? 'absolute inset-0 h-full'
                              : 'block h-auto max-w-full'
                          )}
                          onLoad={(e) => {
                            const el = e.currentTarget;
                            if (el.naturalWidth && el.naturalHeight) {
                              recordDims(img.path, el.naturalWidth, el.naturalHeight, setDims);
                            }
                          }}
                        />
                        {fixedAspectCell ? (
                          <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[1] bg-gradient-to-t from-black/70 via-black/35 to-transparent px-1 py-1 pt-4">
                            <p className="truncate text-[10px] text-white drop-shadow-sm">
                              {img.name}
                            </p>
                          </div>
                        ) : (
                          <div className="px-1 py-1">
                            <p className="truncate text-[10px] text-muted-foreground">
                              {img.name}
                            </p>
                            {availableTab === 'other' && (
                              <p className="text-[9px] text-muted-foreground/80">
                                View only
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-2 border-t border-border pt-3">
            <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div className="flex-1 min-w-0">
                <label className="block text-sm font-medium" htmlFor="atlas-builder-name">
                  atlas name
                </label>
                <div className="relative mt-1">
                  {atlasNameEnterError && (
                    <div
                      id="atlas-name-enter-error"
                      role="tooltip"
                      className="absolute bottom-full left-1/2 z-50 mb-1 w-max max-w-[min(calc(100vw-2rem),24rem)] -translate-x-1/2 rounded-md border border-destructive/60 bg-destructive/10 px-2 py-1.5 text-center text-xs font-medium text-destructive shadow-md"
                    >
                      {atlasNameEnterError}
                    </div>
                  )}
                  <input
                    id="atlas-builder-name"
                    type="text"
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      setAtlasNameEnterError(null);
                    }}
                    onKeyDown={handleAtlasNameKeyDown}
                    placeholder="e.g.: my-custom-atlas"
                    aria-invalid={Boolean(atlasNameEnterError)}
                    aria-describedby={atlasNameEnterError ? 'atlas-name-enter-error' : undefined}
                    className={cn(
                      'block w-full rounded-md border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground',
                      atlasNameEnterError ? 'border-destructive' : 'border-input'
                    )}
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={onClose}>
                  Cancel
                </Button>
                <Button type="button" onClick={handleCreate} disabled={!canSubmit}>
                  {submitting ? 'Creating...' : 'Create atlas'}
                </Button>
              </div>
            </div>
            {error && (
              <p className="text-xs font-medium text-destructive">{error}</p>
            )}
          </div>
        </CardContent>
        </div>
        <AssetLoadingOverlay
          show={submitting}
          variant="modal"
          label="Building atlas on server…"
          subLabel="Please wait for response."
        />
      </Card>
    </div>
  );
}
