import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFloppyDisk } from '@fortawesome/free-solid-svg-icons';
import { filesService } from '../../services/filesService';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { cn } from '../../lib/utils';
import { TabPanelLoading } from './TabPanelLoading';
import { SpritesheetFolderTree, type SpritesheetFileOption } from './SpritesheetFolderTree';
import { bestGrid, buildSimulatedAtlasMetadata } from './atlasPreviewUtils';
import { SpriteFramePreviewPanel } from './SpriteFramePreviewPanel';
import { JsonRawHighlight } from './JsonRawHighlight';
import {
  countAnimationFrames,
  extractAnimationFrameToCanvas,
  ANIMATION_FRAME_SIZE,
} from './animationEditFrameUtils';

export type { SpritesheetFileOption };

const ANIMATIONS_ROOT = '/assets/images/animations';

const FILE_NAME_REGEX = /^[a-zA-Z0-9._-]+$/;

type PanelTab = 'collection' | 'json';

type Props = {
  files: SpritesheetFileOption[];
  filesLoading?: boolean;
  onClose: () => void;
  onSaved?: () => void;
};

function basenameNoExt(p: string): string {
  const base = p.split(/[/\\]/).pop() ?? 'export';
  return base.replace(/\.[^.]+$/, '') || 'export';
}

export function AnimationEditModal({ files, filesLoading = false, onClose, onSaved }: Props) {
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [frameCanvases, setFrameCanvases] = useState<HTMLCanvasElement[]>([]);
  const [selectedFrames, setSelectedFrames] = useState<Set<number>>(new Set());
  const [decodeLoading, setDecodeLoading] = useState(false);
  const [panelTab, setPanelTab] = useState<PanelTab>('collection');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveOk, setSaveOk] = useState<string | null>(null);
  const [saveFileName, setSaveFileName] = useState('');

  const [playing, setPlaying] = useState(false);
  const [currentFrame, setCurrentFrame] = useState(0);
  const [startFrame, setStartFrame] = useState(0);
  const [endFrame, setEndFrame] = useState(0);
  const [frameRate, setFrameRate] = useState(10);

  const [treeVisible, setTreeVisible] = useState(true);
  const [ctrlPressed, setCtrlPressed] = useState(false);

  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const previewWrapRef = useRef<HTMLDivElement>(null);
  const animCanvasRef = useRef<HTMLCanvasElement>(null);
  const animFsWrapRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setSelectedPath((prev) => {
      if (!prev) return null;
      return files.some((f) => f.path === prev) ? prev : null;
    });
  }, [files]);

  useEffect(() => {
    if (!saveOk) return;
    const t = window.setTimeout(() => setSaveOk(null), 5000);
    return () => window.clearTimeout(t);
  }, [saveOk]);

  useEffect(() => {
    if (!selectedPath) {
      setDecodeLoading(false);
      setFrameCanvases([]);
      setSelectedFrames(new Set());
      setSaveFileName('');
      setTreeVisible(true);
      return;
    }
    setDecodeLoading(true);
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const { cols, total } = countAnimationFrames(img.naturalWidth, img.naturalHeight);
      if (total < 1) {
        setFrameCanvases([]);
        setSelectedFrames(new Set());
        setDecodeLoading(false);
        return;
      }
      const next: HTMLCanvasElement[] = [];
      for (let i = 0; i < total; i++) {
        next.push(extractAnimationFrameToCanvas(img, i, cols));
      }
      setFrameCanvases(next);
      setSelectedFrames(new Set(next.map((_, i) => i)));
      const base = basenameNoExt(selectedPath);
      const extMatch = selectedPath.match(/\.[^.]+$/);
      const ext = extMatch ? extMatch[0] : '.webp';
      setSaveFileName(`${base}-customize${ext}`);
      setDecodeLoading(false);
      setTreeVisible(false);
    };
    img.onerror = () => {
      setFrameCanvases([]);
      setSelectedFrames(new Set());
      setDecodeLoading(false);
    };
    img.src = selectedPath;
  }, [selectedPath]);

  const orderedSelectedIndices = useMemo(() => [...selectedFrames].sort((a, b) => a - b), [selectedFrames]);

  const outputFrameCanvases = useMemo(
    () => orderedSelectedIndices.map((i) => frameCanvases[i]).filter(Boolean),
    [frameCanvases, orderedSelectedIndices]
  );

  const outputCount = outputFrameCanvases.length;

  const gridInfo = useMemo(() => {
    if (outputCount === 0) return null;
    return bestGrid(outputCount, ANIMATION_FRAME_SIZE, ANIMATION_FRAME_SIZE);
  }, [outputCount]);

  useEffect(() => {
    const last = Math.max(0, outputCount - 1);
    setStartFrame(0);
    setEndFrame(last);
    setCurrentFrame(0);
    setPlaying(false);
  }, [outputCount, selectedPath]);

  useEffect(() => {
    const safeStart = Math.max(0, Math.floor(startFrame));
    const safeEnd = Math.max(safeStart, Math.min(Math.max(0, outputCount - 1), Math.floor(endFrame)));
    setCurrentFrame((prev) => {
      if (prev < safeStart || prev > safeEnd) return safeStart;
      return prev;
    });
  }, [startFrame, endFrame, outputCount]);

  useEffect(() => {
    if (!playing || outputCount === 0) return;
    const safeStart = Math.max(0, Math.min(Math.floor(startFrame), outputCount - 1));
    const safeEnd = Math.max(
      safeStart,
      Math.min(Math.floor(endFrame), outputCount - 1)
    );
    const intervalMs = Math.max(20, Math.floor(1000 / Math.max(1, frameRate)));
    const timer = window.setInterval(() => {
      setCurrentFrame((prev) => (prev >= safeEnd ? safeStart : prev + 1));
    }, intervalMs);
    return () => window.clearInterval(timer);
  }, [playing, startFrame, endFrame, frameRate, outputCount]);

  const drawAnimFrame = useCallback(
    (idx: number) => {
      const canvas = animCanvasRef.current;
      const src = outputFrameCanvases[idx];
      if (!canvas || !src) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(src, 0, 0, ANIMATION_FRAME_SIZE, ANIMATION_FRAME_SIZE);
    },
    [outputFrameCanvases]
  );

  useEffect(() => {
    if (outputCount === 0) return;
    drawAnimFrame(currentFrame);
  }, [outputCount, currentFrame, drawAnimFrame]);

  useEffect(() => {
    if (panelTab !== 'collection' || !gridInfo || outputCount === 0) return;
    const canvas = previewCanvasRef.current;
    const wrap = previewWrapRef.current;
    if (!canvas || !wrap) return;

    let cancelled = false;
    const run = () => {
      if (cancelled) return;
      const { columns, sheetWidth, sheetHeight } = gridInfo;
      const maxDisplayW = Math.max(1, wrap.clientWidth);
      const maxDisplayH = 220;
      const fit = Math.min(1, maxDisplayW / sheetWidth, maxDisplayH / sheetHeight);
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
      outputFrameCanvases.forEach((fc, index) => {
        const col = index % columns;
        const row = Math.floor(index / columns);
        ctx.drawImage(
          fc,
          col * ANIMATION_FRAME_SIZE,
          row * ANIMATION_FRAME_SIZE
        );
      });
      ctx.strokeStyle = 'rgba(255,255,255,0.2)';
      ctx.lineWidth = 1 / Math.max(fit, 0.0001);
      for (let c = 0; c <= gridInfo.columns; c++) {
        const gx = c * ANIMATION_FRAME_SIZE;
        ctx.beginPath();
        ctx.moveTo(gx, 0);
        ctx.lineTo(gx, sheetHeight);
        ctx.stroke();
      }
      for (let r = 0; r <= gridInfo.rows; r++) {
        const gy = r * ANIMATION_FRAME_SIZE;
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
  }, [panelTab, gridInfo, outputFrameCanvases, outputCount]);

  const toggleFullscreenForElement = (el: HTMLElement | null) => {
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
  };

  const toggleSelectFrame = (i: number) => {
    setSelectedFrames((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  };

  const selectAllFrames = useCallback(() => {
    setSelectedFrames(new Set(frameCanvases.map((_, i) => i)));
  }, [frameCanvases]);

  const clearSelection = useCallback(() => {
    setSelectedFrames(new Set());
  }, []);

  const handleReset = () => {
    setSelectedPath(null);
    setFrameCanvases([]);
    setSelectedFrames(new Set());
    setSaveError(null);
    setSaveOk(null);
    setPanelTab('collection');
  };

  const normalizedSaveName = saveFileName.trim();
  const saveNameValid =
    normalizedSaveName.length > 0 &&
    FILE_NAME_REGEX.test(normalizedSaveName) &&
    /\.(webp|png)$/i.test(normalizedSaveName);

  const canSave = Boolean(
    selectedPath && saveNameValid && outputCount > 0 && gridInfo && !saving
  );

  const handleSave = useCallback(async () => {
    if (!canSave || !gridInfo || !selectedPath) return;
    try {
      setSaving(true);
      setSaveError(null);
      setSaveOk(null);
      const ext = normalizedSaveName.toLowerCase().endsWith('.png') ? 'png' : 'webp';
      const name =
        normalizedSaveName.toLowerCase().endsWith('.png') ||
        normalizedSaveName.toLowerCase().endsWith('.webp')
          ? normalizedSaveName
          : `${normalizedSaveName}.${ext}`;
      const result = await filesService.composeAnimationSpritesheet(
        selectedPath,
        orderedSelectedIndices,
        name
      );
      setSaveOk(`Đã lưu: ${result.imageUrl}`);
      onSaved?.();
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { error?: string } } }).response?.data?.error
          : 'Lưu thất bại';
      setSaveError(msg || 'Lưu thất bại');
    } finally {
      setSaving(false);
    }
  }, [
    canSave,
    gridInfo,
    frameCanvases,
    orderedSelectedIndices,
    normalizedSaveName,
    selectedPath,
    onSaved,
  ]);

  const frameThumbs = useMemo(
    () => frameCanvases.map((c) => c.toDataURL('image/png')),
    [frameCanvases]
  );

  const simulatedAtlas = useMemo(() => {
    if (outputCount === 0) return null;
    const selectedKeys = orderedSelectedIndices.map((i) => `/animation-frame/${i}.png`);
    const dims: Record<string, { w: number; h: number }> = {};
    selectedKeys.forEach((k) => {
      dims[k] = { w: ANIMATION_FRAME_SIZE, h: ANIMATION_FRAME_SIZE };
    });
    return buildSimulatedAtlasMetadata(
      selectedKeys,
      (p) => dims[p],
      basenameNoExt(normalizedSaveName || 'animation-customize')
    );
  }, [outputCount, orderedSelectedIndices, normalizedSaveName]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Control') {
        setCtrlPressed(true);
      }
      if (e.ctrlKey && (e.key === 'a' || e.key === 'A')) {
        e.preventDefault();
        selectAllFrames();
      }
      if (e.ctrlKey && (e.key === 'x' || e.key === 'X')) {
        e.preventDefault();
        clearSelection();
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Control') {
        setCtrlPressed(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [selectAllFrames, clearSelection]);

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 p-4"
      onClick={() => {
        if (!saving) onClose();
      }}
    >
      <Card
        className="relative max-h-[min(96vh,900px)] w-full max-w-6xl overflow-hidden border bg-card shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        aria-busy={saving}
      >
        <div aria-hidden={saving}>
          <CardHeader className="flex flex-row items-center justify-between gap-2 px-4 py-3">
            <CardTitle className="text-lg font-semibold tracking-tight">Animation edit</CardTitle>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" type="button" disabled={saving} onClick={onClose}>
                ✕
              </Button>
            </div>
          </CardHeader>
          <CardContent className="max-h-[calc(min(96vh,900px)-7rem)] space-y-4 overflow-y-auto">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-stretch">
              <AnimatePresence initial={false}>
                {treeVisible && (
                  <motion.div
                    key="animations-tree"
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -12 }}
                    transition={{ duration: 0.18, ease: 'easeOut' }}
                    className="flex w-full shrink-0 flex-col lg:w-64 xl:w-72"
                  >
                    <div className="mb-1 h-6" aria-hidden />
                    <SpritesheetFolderTree
                      files={files}
                      selectedPath={selectedPath}
                      onSelect={(path) => setSelectedPath(path)}
                      loading={filesLoading}
                      rootWebPrefix={ANIMATIONS_ROOT}
                      emptyMessage="Chưa có ảnh trong assets/images/animations."
                      className="h-[565px]"
                    />
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="relative flex min-h-0 min-w-0 flex-1 flex-col">
                {!selectedPath ? (
                  <>
                    <label className="mb-1 block text-sm font-medium">Frames &amp; preview</label>
                    <div
                      className="flex h-[565px] flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border bg-muted/40 px-4 text-center"
                      role="status"
                    >
                      {filesLoading ? (
                        <>
                          <div
                            className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent"
                            aria-hidden
                          />
                          <p className="text-sm text-muted-foreground">Đang tải danh sách…</p>
                        </>
                      ) : (
                        <>
                          <p className="text-sm font-medium text-foreground">Chưa chọn ảnh</p>
                          <p className="max-w-sm text-xs text-muted-foreground">
                            Chọn một file trong cây <span className="font-mono text-[11px]">animations</span> — frame
                            cố định {ANIMATION_FRAME_SIZE}×{ANIMATION_FRAME_SIZE}px.
                          </p>
                        </>
                      )}
                    </div>
                  </>
                ) : (
                  <>
                    <TabPanelLoading show={decodeLoading} label="Đang tải & cắt frame…" />
                    <label className="mb-1 block text-sm font-medium">
                      Nguồn: {frameCanvases.length} frame · đã chọn {outputCount}
                    </label>
                    <div className="mb-2 flex flex-wrap items-end justify-between gap-x-2 gap-y-1 border-b border-border">
                      <div className="flex min-w-0 flex-wrap items-center gap-1" role="tablist">
                        <button
                          type="button"
                          role="tab"
                          aria-selected={treeVisible}
                          className={cn(
                            '-mb-px border-b-2 px-2 py-1.5 text-xs font-medium transition-colors',
                            treeVisible
                              ? 'border-primary text-foreground'
                              : 'border-transparent text-muted-foreground hover:text-foreground'
                          )}
                          onClick={() => setTreeVisible((v) => !v)}
                        >
                          open list
                        </button>
                        {(['collection', 'json'] as const).map((tab) => (
                          <button
                            key={tab}
                            type="button"
                            role="tab"
                            aria-selected={panelTab === tab}
                            className={cn(
                              '-mb-px border-b-2 px-2 py-1.5 text-xs font-medium capitalize transition-colors',
                              panelTab === tab
                                ? 'border-primary text-foreground'
                                : 'border-transparent text-muted-foreground hover:text-foreground'
                            )}
                            onClick={() => setPanelTab(tab)}
                          >
                            {tab}
                          </button>
                        ))}
                      </div>
                      <div className="flex flex-wrap gap-1">
                        <button
                          type="button"
                          className="-mb-px px-2 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
                          onClick={handleReset}
                        >
                          reset
                        </button>
                      </div>
                    </div>

                    <div
                      className={cn(
                        'flex min-h-[260px] flex-col overflow-hidden rounded-lg border',
                        panelTab === 'collection'
                          ? 'border-dashed border-border bg-muted'
                          : 'border-border bg-muted/50'
                      )}
                    >
                      {panelTab === 'collection' && (
                        <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 overflow-y-auto p-3 lg:grid-cols-3">
                          <div className="min-h-0 rounded-md border border-border bg-card p-2">
                            {outputCount > 0 ? (
                              <SpriteFramePreviewPanel
                                className="mt-0 min-h-[260px] border-none bg-transparent p-0"
                                caption={
                                  <p className="text-[11px] text-muted-foreground">
                                    Spritesheet — frame {ANIMATION_FRAME_SIZE}×{ANIMATION_FRAME_SIZE}px (theo frame đã chọn)
                                  </p>
                                }
                                playing={playing}
                                onTogglePlay={() => setPlaying((p) => !p)}
                                onReset={() => {
                                  setPlaying(false);
                                  setCurrentFrame(Math.max(0, Math.floor(startFrame)));
                                }}
                                currentFrame={currentFrame}
                                totalFrames={outputCount}
                                startFrame={startFrame}
                                endFrame={endFrame}
                                frameRate={frameRate}
                                onStartFrameChange={setStartFrame}
                                onEndFrameChange={setEndFrame}
                                onFrameRateChange={setFrameRate}
                                canvas={
                                  <div
                                    ref={animFsWrapRef}
                                    role="presentation"
                                    className="flex h-full min-h-0 w-full min-w-0 cursor-pointer items-center justify-center bg-black/80 p-1 [:fullscreen]:min-h-screen [:fullscreen]:w-screen [:fullscreen]:bg-black [:fullscreen]:p-4"
                                    onDoubleClick={() => toggleFullscreenForElement(animFsWrapRef.current)}
                                    title="Double-click for fullscreen"
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
                            ) : (
                              <p className="text-xs text-muted-foreground">Chọn ít nhất một frame để xem animation.</p>
                            )}
                          </div>

                          <div className="min-h-0 space-y-1 rounded-md border border-border bg-card p-2">
                            <p className="text-[11px] font-medium text-muted-foreground">
                              Preview spritesheet đã ghép ({outputCount} frame)
                            </p>
                            <div
                              ref={previewWrapRef}
                              className="flex min-h-[180px] w-full items-center justify-center overflow-auto rounded-md border border-border bg-black/30 p-2"
                            >
                              {outputCount === 0 ? (
                                <p className="text-xs text-muted-foreground">Chọn ít nhất một frame.</p>
                              ) : (
                                <canvas
                                  ref={previewCanvasRef}
                                  className="max-h-[260px] w-auto max-w-full rounded border border-border bg-black/20 image-rendering-pixelated"
                                  aria-label="Preview spritesheet ghép"
                                />
                              )}
                            </div>
                          </div>

                          <div className="min-h-0 space-y-1 rounded-md border border-border bg-card p-2">
                            <div className="flex flex-wrap items-center justify-between gap-1">
                              <p className="text-[11px] font-medium text-muted-foreground">
                                Chọn frame (hover + Ctrl để chọn, Ctrl+A chọn tất cả, Ctrl+X bỏ chọn)
                              </p>
                              <div className="flex flex-wrap gap-1">
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  className="h-6 px-1.5 text-[11px]"
                                  onClick={selectAllFrames}
                                >
                                  Chọn tất cả
                                </Button>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  className="h-6 px-1.5 text-[11px]"
                                  onClick={clearSelection}
                                >
                                  Bỏ chọn
                                </Button>
                              </div>
                            </div>
                            <div className="flex max-h-[320px] flex-wrap gap-2 overflow-y-auto content-start">
                              {frameCanvases.map((_, i) => {
                                const on = selectedFrames.has(i);
                                return (
                                  <button
                                    key={i}
                                    type="button"
                                    className={cn(
                                      'flex cursor-pointer flex-col gap-1 rounded-md border p-1 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
                                      on ? 'border-primary bg-primary/10' : 'border-border bg-background hover:bg-muted'
                                    )}
                                    onClick={() => toggleSelectFrame(i)}
                                    onMouseEnter={() => {
                                      if (!ctrlPressed) return;
                                      setSelectedFrames((prev) => {
                                        const next = new Set(prev);
                                        next.add(i);
                                        return next;
                                      });
                                    }}
                                  >
                                    <span className="px-0.5 text-left text-[10px] font-mono text-muted-foreground">
                                      #{i}
                                    </span>
                                    <div className="h-16 w-16 overflow-hidden rounded border border-border bg-black/20">
                                      {frameThumbs[i] ? (
                                        <img
                                          src={frameThumbs[i]}
                                          alt={`frame ${i}`}
                                          className="h-full w-full object-cover object-top select-none"
                                          draggable={false}
                                        />
                                      ) : null}
                                    </div>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      )}

                      {panelTab === 'json' && (
                        <div className="min-h-0 flex-1 overflow-hidden p-2">
                          {simulatedAtlas ? (
                            <JsonRawHighlight data={simulatedAtlas.metadata} className="!max-h-[420px]" />
                          ) : (
                            <p className="text-xs text-muted-foreground">Chưa có frame để dựng JSON.</p>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="mt-3 space-y-2 rounded-lg border border-border bg-muted/50 p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <label className="text-[11px] font-medium text-muted-foreground">
                          Tên file lưu (mới) trong animations
                        </label>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className={cn(
                            'h-7 px-2 text-[11px]',
                            !canSave && 'cursor-not-allowed opacity-60'
                          )}
                          disabled={!canSave}
                          title="Lưu spritesheet mới vào animations"
                          onClick={() => void handleSave()}
                        >
                          <FontAwesomeIcon icon={faFloppyDisk} className="mr-1 h-3 w-3" />
                          Lưu
                        </Button>
                      </div>
                      <input
                        type="text"
                        value={saveFileName}
                        onChange={(e) => setSaveFileName(e.target.value)}
                        placeholder="ten-moi.webp"
                        className="block w-full rounded-md border border-input bg-background px-2 py-1.5 font-mono text-xs text-foreground"
                      />
                      {!saveNameValid && normalizedSaveName.length > 0 && (
                        <p className="text-[11px] text-destructive">
                          Chỉ chữ, số, . _ - và đuôi .webp hoặc .png
                        </p>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>

            {saveError && <p className="text-xs font-medium text-destructive">{saveError}</p>}
            {saveOk && <p className="text-xs font-medium text-emerald-600">{saveOk}</p>}
          </CardContent>
        </div>

        {saving && (
          <div
            className="absolute inset-0 z-[100] flex flex-col items-center justify-center gap-3 bg-card/95 backdrop-blur-sm"
            role="status"
            aria-live="polite"
            aria-busy="true"
          >
            <div
              className="h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent"
              aria-hidden
            />
            <p className="text-sm font-medium text-foreground">Đang lưu…</p>
          </div>
        )}
      </Card>
    </div>
  );
}
