import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import type { IconProp } from '@fortawesome/fontawesome-svg-core';
import {
  faFolder,
  faLightbulb as faLightbulbSolid,
  faTrashCan,
} from '@fortawesome/free-solid-svg-icons';
import { faLightbulb as faLightbulbRegular } from '@fortawesome/free-regular-svg-icons';
import { Button } from '../ui/button';
import { ConfirmDangerDialog } from '../ConfirmDangerDialog';
import { AtlasJsonRawHighlight } from './AtlasJsonRawHighlight';
import { filesService, type AtlasFileEntry } from '../../services/filesService';
import { extractAtlasFrameEntries } from './atlasFrameUtils';

function exportAtlasErrorMessage(err: unknown): string {
  if (axios.isAxiosError(err) && err.response?.data) {
    const d = err.response.data as { error?: string };
    if (typeof d.error === 'string') return d.error;
  }
  if (err instanceof Error) return err.message;
  return 'unknown';
}

type AtlasViewModalProps = {
  entry: AtlasFileEntry | null;
  onClose: () => void;
  onDeleteRequested?: (name: string) => void;
  onDeleteSucceeded?: (name: string) => void;
  onDeleteFailed?: (name: string) => void;
  /** Gọi sau khi xuất bản sao sang TeyvatCard/public thành công (tuỳ chọn, ví dụ refresh danh sách). */
  onAtlasExportedToTeyvatSucceeded?: () => void;
};

function formatFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const exp = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** exp;
  const fractionDigits = value >= 100 || exp === 0 ? 0 : value >= 10 ? 1 : 2;
  return `${value.toFixed(fractionDigits)} ${units[exp]}`;
}

export function AtlasViewModal({
  entry,
  onClose,
  onDeleteRequested,
  onDeleteSucceeded,
  onDeleteFailed,
  onAtlasExportedToTeyvatSucceeded,
}: AtlasViewModalProps) {
  const open = entry !== null;
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [jsonLoading, setJsonLoading] = useState(false);
  const [jsonData, setJsonData] = useState<unknown>(null);
  const [imageEl, setImageEl] = useState<HTMLImageElement | null>(null);
  const [selectedFrameKey, setSelectedFrameKey] = useState<string | null>(null);
  const [canvasBgMode, setCanvasBgMode] = useState<'dark' | 'light'>('light');
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [exportTeyvatLoading, setExportTeyvatLoading] = useState(false);
  const [exportOverwriteConfirmOpen, setExportOverwriteConfirmOpen] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [currentFrame, setCurrentFrame] = useState(0);
  const [startFrame, setStartFrame] = useState(0);
  const [endFrame, setEndFrame] = useState(0);
  const [frameRate, setFrameRate] = useState(12);
  const [selectedAnimBase, setSelectedAnimBase] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animCanvasRef = useRef<HTMLCanvasElement>(null);

  const frameEntries = useMemo(() => extractAtlasFrameEntries(jsonData), [jsonData]);
  const frameNameSet = useMemo(() => new Set(frameEntries.map((e) => e.name)), [frameEntries]);
  const hasAnimationMeta = useMemo(() => {
    if (!jsonData || typeof jsonData !== 'object') return false;
    const meta = (jsonData as { meta?: { hasAnimation?: boolean } }).meta;
    return Boolean(meta?.hasAnimation);
  }, [jsonData]);

  const frameGroups = useMemo(() => {
    const groups = new Map<string, Array<{ name: string; index: number; frame: { x: number; y: number; w: number; h: number } }>>();
    frameEntries.forEach((entry) => {
      const m = entry.name.match(/^(.*)_([0-9]+)$/);
      if (!m) return;
      const base = m[1];
      const idx = Number(m[2]);
      if (!Number.isFinite(idx)) return;
      if (!groups.has(base)) groups.set(base, []);
      groups.get(base)!.push({ name: entry.name, index: idx, frame: entry.frame });
    });
    groups.forEach((arr) => arr.sort((a, b) => a.index - b.index));
    return groups;
  }, [frameEntries]);

  const activeAnimFrames = useMemo(() => {
    if (!selectedAnimBase) return [];
    return frameGroups.get(selectedAnimBase) ?? [];
  }, [frameGroups, selectedAnimBase]);

  const totalAnimFrames = activeAnimFrames.length;

  useEffect(() => {
    if (!entry) {
      setJsonData(null);
      setJsonError(null);
      setJsonLoading(false);
      setImageEl(null);
      setSelectedFrameKey(null);
      setSelectedAnimBase(null);
      setPlaying(false);
      setCurrentFrame(0);
      setStartFrame(0);
      setEndFrame(0);
      return;
    }
    setSelectedFrameKey(null);
    setCanvasBgMode('light');
    const controller = new AbortController();
    setJsonLoading(true);
    setJsonError(null);
    setJsonData(null);
    fetch(entry.jsonUrl, { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json() as Promise<unknown>;
      })
      .then((data) => {
        setJsonData(data);
      })
      .catch((err: unknown) => {
        if (err instanceof Error && err.name === 'AbortError') return;
        setJsonError(err instanceof Error ? err.message : 'Cannot read JSON');
      })
      .finally(() => {
        setJsonLoading(false);
      });
    return () => controller.abort();
  }, [entry]);

  useEffect(() => {
    const last = Math.max(0, totalAnimFrames - 1);
    setStartFrame(0);
    setEndFrame(last);
    setCurrentFrame(0);
    setPlaying(totalAnimFrames > 1);
  }, [selectedAnimBase, totalAnimFrames]);

  useEffect(() => {
    if (!playing || totalAnimFrames <= 0) return;
    const safeStart = Math.max(0, Math.min(Math.floor(startFrame), totalAnimFrames - 1));
    const safeEnd = Math.max(safeStart, Math.min(Math.floor(endFrame), totalAnimFrames - 1));
    const intervalMs = Math.max(20, Math.floor(1000 / Math.max(1, frameRate)));
    const timer = window.setInterval(() => {
      setCurrentFrame((prev) => (prev >= safeEnd ? safeStart : prev + 1));
    }, intervalMs);
    return () => window.clearInterval(timer);
  }, [playing, startFrame, endFrame, frameRate, totalAnimFrames]);

  useEffect(() => {
    if (!entry) return;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => setImageEl(img);
    img.onerror = () => setImageEl(null);
    img.src = entry.imageUrl;
    return () => {
      img.onload = null;
      img.onerror = null;
    };
  }, [entry]);

  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container || !imageEl?.complete || !imageEl.naturalWidth) return;

    const cw = container.clientWidth;
    const ch = container.clientHeight;
    if (cw < 2 || ch < 2) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.floor(cw * dpr);
    canvas.height = Math.floor(ch * dpr);
    canvas.style.width = `${cw}px`;
    canvas.style.height = `${ch}px`;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, cw, ch);
    ctx.fillStyle = canvasBgMode === 'light' ? '#ffffff' : '#0f172a';
    ctx.fillRect(0, 0, cw, ch);

    const iw = imageEl.naturalWidth;
    const ih = imageEl.naturalHeight;
    const scale = Math.min(cw / iw, ch / ih);
    const dw = iw * scale;
    const dh = ih * scale;
    const ox = (cw - dw) / 2;
    const oy = (ch - dh) / 2;

    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(imageEl, 0, 0, iw, ih, ox, oy, dw, dh);

    if (!selectedFrameKey) return;
    const found = frameEntries.find((e) => e.name === selectedFrameKey);
    if (!found) return;

    const { x, y, w, h } = found.frame;
    const rx = ox + x * scale;
    const ry = oy + y * scale;
    const rw = w * scale;
    const rh = h * scale;

    ctx.strokeStyle = 'rgba(34, 197, 94, 0.95)';
    ctx.lineWidth = 4;
    ctx.setLineDash([]);
    ctx.strokeRect(rx, ry, rw, rh);

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.lineWidth = 2;
    if (rw > 4 && rh > 4) {
      ctx.strokeRect(rx + 1, ry + 1, rw - 2, rh - 2);
    }
  }, [imageEl, frameEntries, selectedFrameKey, canvasBgMode]);

  useEffect(() => {
    drawCanvas();
  }, [drawCanvas]);

  useEffect(() => {
    const canvas = animCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const size = 256;
    canvas.width = size;
    canvas.height = size;
    ctx.clearRect(0, 0, size, size);
    ctx.fillStyle = '#0b1220';
    ctx.fillRect(0, 0, size, size);
    if (!imageEl || totalAnimFrames === 0) return;
    const safe = Math.max(0, Math.min(Math.floor(currentFrame), totalAnimFrames - 1));
    const found = activeAnimFrames[safe];
    if (!found) return;
    const { x, y, w, h } = found.frame;
    const scale = Math.min(size / w, size / h);
    const dw = w * scale;
    const dh = h * scale;
    const ox = (size - dw) / 2;
    const oy = (size - dh) / 2;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(imageEl, x, y, w, h, ox, oy, dw, dh);
  }, [imageEl, activeAnimFrames, currentFrame, totalAnimFrames]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      drawCanvas();
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [drawCanvas]);

  const imageFileSizeLabel = useMemo(
    () =>
      entry ? `File size: ${formatFileSize(entry.imageMeta?.size ?? 0)}` : '',
    [entry]
  );

  const handleExportAtlasToTeyvat = useCallback(async () => {
    if (!entry) return;
    setExportTeyvatLoading(true);
    try {
      const r = await filesService.exportAtlasDualVariantsToTeyvat(
        entry.name,
        entry.scope,
        false
      );
      if ('needsOverwrite' in r) {
        setExportOverwriteConfirmOpen(true);
        return;
      }
      if (!r.ok) {
        window.alert(r.error);
        return;
      }
      onAtlasExportedToTeyvatSucceeded?.();
      const destList = r.exported
        .map((s: 'desktop' | 'mobile') => `TeyvatCard/public/assets/images/${s}/atlas`)
        .join(' and ');
      window.alert(
        `Created copies "${entry.name}.webp" + "${entry.name}.json" at ${destList}. Source is only from server/atlas/desktop and/or server/atlas/mobile (original server/atlas remains unchanged).`
      );
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Failed to export atlas to TeyvatCard/public', err);
      window.alert(`Atlas export failed: ${exportAtlasErrorMessage(err)}`);
    } finally {
      setExportTeyvatLoading(false);
    }
  }, [entry, onAtlasExportedToTeyvatSucceeded]);

  const handleExportOverwriteConfirm = useCallback(async () => {
    if (!entry) return;
    setExportTeyvatLoading(true);
    try {
      const r = await filesService.exportAtlasDualVariantsToTeyvat(
        entry.name,
        entry.scope,
        true
      );
      if ('needsOverwrite' in r) {
        setExportOverwriteConfirmOpen(true);
        return;
      }
      if (!r.ok) {
        window.alert(r.error);
        return;
      }
      setExportOverwriteConfirmOpen(false);
      onAtlasExportedToTeyvatSucceeded?.();
      const destList = r.exported
        .map((s: 'desktop' | 'mobile') => `TeyvatCard/public/assets/images/${s}/atlas`)
        .join(' and ');
      window.alert(
        `Overwrote "${entry.name}.webp" + "${entry.name}.json" at ${destList}. (server/atlas unchanged.)`
      );
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Failed to overwrite export atlas', err);
      window.alert(`Overwrite failed: ${exportAtlasErrorMessage(err)}`);
    } finally {
      setExportTeyvatLoading(false);
    }
  }, [entry, onAtlasExportedToTeyvatSucceeded]);

  if (!open || !entry) return null;

  const isCanvasLight = canvasBgMode === 'light';

  const handleDeleteConfirm = async () => {
    if (!entry) return;
    const deletingName = entry.name;
    console.log('[AtlasDelete] confirm clicked', { deletingName });
    // Chỉ đổi trạng thái visual (đỏ) trước, chưa ẩn item.
    onDeleteRequested?.(deletingName);
    setDeleteConfirmOpen(false);
    onClose();
    try {
      setDeleteLoading(true);
      console.log('[AtlasDelete] calling API deleteAtlas', { deletingName });
      await filesService.deleteAtlas(deletingName, entry.scope);
      console.log('[AtlasDelete] API success', { deletingName });
      onDeleteSucceeded?.(deletingName);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Failed to delete atlas', err);
      console.log('[AtlasDelete] API failed', {
        deletingName,
        error: err instanceof Error ? err.message : 'unknown',
      });
      onDeleteFailed?.(deletingName);
      window.alert(`Failed to delete atlas "${deletingName}" on server.`);
    } finally {
      setDeleteLoading(false);
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60 p-3 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="atlas-view-modal-title"
      onClick={onClose}
    >
      <div
        className="flex h-[min(92vh,900px)] w-full max-w-[min(96vw,1400px)] flex-col overflow-hidden rounded-xl border border-border bg-card shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border px-4 py-3">
          <h2 id="atlas-view-modal-title" className="min-w-0 flex-1 truncate text-lg font-semibold tracking-tight">
            {entry.name}
          </h2>
          <div className="flex shrink-0 items-center gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="shrink-0 gap-1.5"
              disabled={exportTeyvatLoading}
              onClick={() => void handleExportAtlasToTeyvat()}
              title={
                entry.scope === 'default'
                  ? 'Export from server/atlas/desktop and server/atlas/mobile to TeyvatCard/public/assets/images (without reading files in original server/atlas)'
                  : 'Export same-name versions for both desktop and mobile to TeyvatCard/public/assets/images'
              }
              aria-label="Browse atlas: export copies to TeyvatCard public"
            >
              <FontAwesomeIcon icon={faFolder as IconProp} className="h-3.5 w-3.5" />
              {exportTeyvatLoading ? 'Exporting…' : 'Browse atlas'}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-9 w-9 shrink-0"
              onClick={() => setDeleteConfirmOpen(true)}
              title="Delete this atlas"
              aria-label="Delete this atlas"
            >
              <FontAwesomeIcon icon={faTrashCan as IconProp} className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-9 w-9 shrink-0"
              onClick={() => setCanvasBgMode((prev) => (prev === 'dark' ? 'light' : 'dark'))}
              title={isCanvasLight ? 'Switch preview background to dark' : 'Switch preview background to light'}
              aria-label={isCanvasLight ? 'Switch preview background to dark' : 'Switch preview background to light'}
            >
              <FontAwesomeIcon
                icon={(isCanvasLight ? faLightbulbRegular : faLightbulbSolid) as IconProp}
                className="h-4 w-4"
              />
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={onClose} aria-label="Close">
              ✕
            </Button>
          </div>
        </div>
        <div className="grid min-h-0 flex-1 grid-cols-1 overflow-hidden lg:grid-cols-2">
          <div
            ref={containerRef}
            className={
              isCanvasLight
                ? 'relative flex min-h-[200px] min-w-0 flex-1 items-center justify-center overflow-hidden bg-muted/40 p-2 lg:min-h-0'
                : 'relative flex min-h-[200px] min-w-0 flex-1 items-center justify-center overflow-hidden bg-slate-950 p-2 lg:min-h-0'
            }
          >
            <canvas
              ref={canvasRef}
              className="block max-h-full max-w-full"
              aria-label={`Atlas ${entry.name}: click JSON key lines to highlight frame`}
            />
            <div className="pointer-events-none absolute bottom-2 right-2 rounded bg-black/60 px-2 py-1 text-[11px] font-medium text-white shadow-sm">
              {imageFileSizeLabel}
            </div>
          </div>
          <div className="flex min-h-0 min-w-0 flex-col overflow-hidden border-t border-border lg:border-l lg:border-t-0">
            {jsonLoading && (
              <p className="p-4 text-sm text-muted-foreground">Loading JSON...</p>
            )}
            {jsonError && (
              <p className="p-4 text-sm text-destructive">{jsonError}</p>
            )}
            {!jsonLoading && !jsonError && jsonData !== null && (
              <div className="min-h-0 flex-1 overflow-auto p-3">
                {hasAnimationMeta && (
                  <div className="sticky top-0 z-20 mb-3 rounded-lg border border-border bg-card/95 p-2 backdrop-blur-sm">
                    <div className="flex flex-col gap-3 lg:flex-row">
                      <div className="flex shrink-0 items-center justify-center rounded border border-border bg-card p-2 lg:w-[220px]">
                        <canvas
                          ref={animCanvasRef}
                          width={256}
                          height={256}
                          className="h-44 w-44 image-rendering-pixelated"
                          aria-label="Animation preview from atlas frames"
                        />
                      </div>
                      <div className="min-w-0 flex-1 space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <Button type="button" variant="outline" size="sm" onClick={() => setPlaying((p) => !p)}>
                            {playing ? 'Pause' : 'Play'}
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setPlaying(false);
                              setCurrentFrame(Math.max(0, Math.floor(startFrame)));
                            }}
                          >
                            Reset
                          </Button>
                          <p className="text-[11px] text-muted-foreground">
                            Current frame: <span className="font-semibold text-foreground">{currentFrame}</span>
                          </p>
                          <p className="text-[11px] text-muted-foreground">
                            Total frames: <span className="font-semibold text-foreground">{totalAnimFrames}</span>
                          </p>
                        </div>
                        <div className="grid gap-2 sm:grid-cols-3">
                          <label className="space-y-1 text-[11px] text-muted-foreground">
                            <span>Start</span>
                            <input
                              type="number"
                              min={0}
                              value={startFrame}
                              onChange={(e) => setStartFrame(Number(e.target.value))}
                              className="block w-full rounded-md border border-input bg-background px-2 py-1 text-xs text-foreground"
                            />
                          </label>
                          <label className="space-y-1 text-[11px] text-muted-foreground">
                            <span>End</span>
                            <input
                              type="number"
                              min={0}
                              value={endFrame}
                              onChange={(e) => setEndFrame(Number(e.target.value))}
                              className="block w-full rounded-md border border-input bg-background px-2 py-1 text-xs text-foreground"
                            />
                          </label>
                          <label className="space-y-1 text-[11px] text-muted-foreground">
                            <span>FrameRate</span>
                            <input
                              type="number"
                              min={1}
                              value={frameRate}
                              onChange={(e) => setFrameRate(Number(e.target.value))}
                              className="block w-full rounded-md border border-input bg-background px-2 py-1 text-xs text-foreground"
                            />
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                <AtlasJsonRawHighlight
                  data={jsonData}
                  frameNames={frameNameSet}
                  selectedFrameKey={selectedFrameKey}
                  onFrameKeyClick={(name) => {
                    setSelectedFrameKey((prev) => (prev === name ? null : name));
                    if (!hasAnimationMeta) return;
                    const m = name.match(/^(.*)_([0-9]+)$/);
                    if (!m) return;
                    const base = m[1];
                    if (!frameGroups.has(base)) return;
                    setSelectedAnimBase(base);
                    setPlaying(true);
                    setCurrentFrame(0);
                  }}
                  className="!max-h-none max-h-[min(85vh,800px)] min-h-[200px]"
                />
              </div>
            )}
          </div>
        </div>
      </div>
      <ConfirmDangerDialog
        open={deleteConfirmOpen}
        onCancel={() => {
          if (deleteLoading) return;
          setDeleteConfirmOpen(false);
        }}
        onConfirm={handleDeleteConfirm}
        confirmLoading={deleteLoading}
        title="Delete atlas?"
        description={`Delete atlas "${entry.name}"? This action cannot be undone.`}
        confirmLabel="Delete atlas"
        confirmLoadingLabel="Deleting…"
        overlayClassName="z-[10060]"
      />
      <ConfirmDangerDialog
        open={exportOverwriteConfirmOpen}
        onCancel={() => {
          if (exportTeyvatLoading) return;
          setExportOverwriteConfirmOpen(false);
        }}
        onConfirm={() => void handleExportOverwriteConfirm()}
        confirmLoading={exportTeyvatLoading}
        title="Overwrite files in TeyvatCard?"
        description={`Files with the same name already exist in TeyvatCard/public (desktop and/or mobile). Overwrite corresponding copies?`}
        confirmLabel="Overwrite"
        confirmLoadingLabel="Overwriting…"
        cancelLabel="Cancel"
        overlayClassName="z-[10062]"
      />
    </div>,
    document.body
  );
}
