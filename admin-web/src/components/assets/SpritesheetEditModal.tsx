import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFloppyDisk } from '@fortawesome/free-solid-svg-icons';
import { filesService } from '../../services/filesService';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { ImageLightbox } from '../ui/ImageLightbox';
import { cn } from '../../lib/utils';
import { JsonRawHighlight } from './JsonRawHighlight';
import { TabPanelLoading } from './TabPanelLoading';
import { AssetLoadingOverlay } from './AssetLoadingOverlay';
import { SpritesheetFolderTree, type SpritesheetFileOption } from './SpritesheetFolderTree';
import { bestGrid, buildSimulatedAtlasMetadata, drawImageCover } from './atlasPreviewUtils';
import {
  countSpritesheetFrames,
  extractFrameToCanvas,
  SPRITESHEET_FRAME_HEIGHT,
  SPRITESHEET_FRAME_WIDTH,
} from './spritesheetEditFrameUtils';

export type { SpritesheetFileOption };

type PanelTab = 'collection' | 'preview' | 'json' | 'resize';

type Props = {
  files: SpritesheetFileOption[];
  /** Đang tải cây assets (Manager Assets). */
  filesLoading?: boolean;
  onClose: () => void;
  /** Sau khi lưu thành công (để refresh cây nếu cần). */
  onSaved?: () => void;
};

export function SpritesheetEditModal({ files, filesLoading = false, onClose, onSaved }: Props) {
  const [selectedPath, setSelectedPath] = useState<string | null>(null);

  /** Không tự chọn file đầu; chỉ bỏ chọn nếu file không còn trong danh sách. */
  useEffect(() => {
    setSelectedPath((prev) => {
      if (!prev) return null;
      return files.some((f) => f.path === prev) ? prev : null;
    });
  }, [files]);
  const [sourceImage, setSourceImage] = useState<HTMLImageElement | null>(null);
  const [frameCanvases, setFrameCanvases] = useState<HTMLCanvasElement[]>([]);
  const [sourceDims, setSourceDims] = useState<{ w: number; h: number } | null>(null);
  const [panelTab, setPanelTab] = useState<PanelTab>('collection');
  const [previewLayout, setPreviewLayout] = useState<'bestGrid' | 'original'>('bestGrid');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveOk, setSaveOk] = useState<string | null>(null);
  const [resizeExporting, setResizeExporting] = useState(false);
  const [resizeError, setResizeError] = useState<string | null>(null);
  const [resizeOk, setResizeOk] = useState<string | null>(null);
  const [decodeLoading, setDecodeLoading] = useState(false);
  const [lightboxFrame, setLightboxFrame] = useState<{ src: string; alt: string } | null>(null);

  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const previewWrapRef = useRef<HTMLDivElement>(null);

  const FW = SPRITESHEET_FRAME_WIDTH;
  const FH = SPRITESHEET_FRAME_HEIGHT;

  useEffect(() => {
    if (!selectedPath) {
      setDecodeLoading(false);
      setSourceImage(null);
      setFrameCanvases([]);
      setSourceDims(null);
      return;
    }
    setDecodeLoading(true);
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const { cols, total } = countSpritesheetFrames(img.naturalWidth, img.naturalHeight);
      setSourceDims({ w: img.naturalWidth, h: img.naturalHeight });
      setSourceImage(img);
      if (total < 1) {
        setFrameCanvases([]);
        setDecodeLoading(false);
        return;
      }
      const next: HTMLCanvasElement[] = [];
      for (let i = 0; i < total; i++) {
        next.push(extractFrameToCanvas(img, i, cols, FW, FH));
      }
      setFrameCanvases(next);
      setDecodeLoading(false);
    };
    img.onerror = () => {
      setSourceImage(null);
      setFrameCanvases([]);
      setSourceDims(null);
      setDecodeLoading(false);
    };
    img.src = selectedPath;
  }, [selectedPath, FW, FH]);

  useEffect(() => {
    setLightboxFrame(null);
    setResizeError(null);
    setResizeOk(null);
  }, [selectedPath]);

  useEffect(() => {
    if (!saveOk) return;
    const t = window.setTimeout(() => setSaveOk(null), 5000);
    return () => window.clearTimeout(t);
  }, [saveOk]);

  useEffect(() => {
    if (!resizeOk) return;
    const t = window.setTimeout(() => setResizeOk(null), 8000);
    return () => window.clearTimeout(t);
  }, [resizeOk]);

  const gridInfo = useMemo(() => {
    const n = frameCanvases.length;
    if (n === 0 || !sourceDims) return null;
    return bestGrid(n, FW, FH);
  }, [frameCanvases.length, sourceDims, FW, FH]);

  const canSave = useMemo(() => {
    if (!sourceDims || !gridInfo || frameCanvases.length === 0) return false;
    const r0 = sourceDims.w / sourceDims.h;
    const r1 = gridInfo.sheetWidth / gridInfo.sheetHeight;
    return Math.abs(r0 - r1) > 1e-5;
  }, [sourceDims, gridInfo, frameCanvases.length]);

  const simulatedName = useMemo(() => {
    if (!selectedPath) return 'export-bestGrid';
    const base =
      selectedPath.split(/[/\\]/).pop()?.replace(/\.[^.]+$/, '') ?? 'export';
    return `${base}-bestGrid`;
  }, [selectedPath]);

  const simulatedAtlas = useMemo(() => {
    if (frameCanvases.length === 0) return null;
    const paths = frameCanvases.map((_, i) => `/spritesheet-frame/${i}`);
    const dims: Record<string, { w: number; h: number }> = {};
    paths.forEach((p) => {
      dims[p] = { w: FW, h: FH };
    });
    return buildSimulatedAtlasMetadata(paths, (p) => dims[p], simulatedName);
  }, [frameCanvases, simulatedName, FW, FH]);

  /** Một lần encode PNG / frame — tránh `toDataURL` trong render (rất nặng). */
  const frameThumbnailDataUrls = useMemo(
    () => frameCanvases.map((c) => c.toDataURL('image/png')),
    [frameCanvases]
  );

  useEffect(() => {
    if (panelTab !== 'preview' || previewLayout !== 'bestGrid') return;
    const canvas = previewCanvasRef.current;
    const wrap = previewWrapRef.current;
    if (!canvas || !wrap || frameCanvases.length === 0) return;
    if (!gridInfo) return;

    let cancelled = false;

    const run = () => {
      if (cancelled) return;
      const { columns, sheetWidth, sheetHeight } = gridInfo;
      const maxDisplayW = Math.max(1, wrap.clientWidth);
      const maxDisplayH = 280;
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

      frameCanvases.forEach((fc, index) => {
        const col = index % columns;
        const row = Math.floor(index / columns);
        const x = col * FW;
        const y = row * FH;
        drawImageCover(ctx, fc, x, y, FW, FH);
      });

      ctx.strokeStyle = 'rgba(255,255,255,0.2)';
      ctx.lineWidth = 1 / Math.max(fit, 0.0001);
      for (let c = 0; c <= gridInfo.columns; c++) {
        const gx = c * FW;
        ctx.beginPath();
        ctx.moveTo(gx, 0);
        ctx.lineTo(gx, sheetHeight);
        ctx.stroke();
      }
      for (let r = 0; r <= gridInfo.rows; r++) {
        const gy = r * FH;
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
  }, [panelTab, previewLayout, frameCanvases, gridInfo, FW, FH]);

  const handleReset = () => {
    setLightboxFrame(null);
    setSelectedPath(null);
    setFrameCanvases([]);
    setSourceImage(null);
    setSourceDims(null);
    setSaveError(null);
    setSaveOk(null);
    setResizeError(null);
    setResizeOk(null);
  };

  const canExportResize = frameCanvases.length > 0 && !decodeLoading;

  const handleExportResize = useCallback(async () => {
    if (!selectedPath || !canExportResize) return;
    try {
      setResizeExporting(true);
      setResizeError(null);
      setResizeOk(null);
      const r = await filesService.exportSpritesheetResizeVariants(selectedPath);
      setResizeOk(
        `Desktop: ${r.desktop.imageUrl} (${r.desktop.sheetSize.w}×${r.desktop.sheetSize.h}) · Mobile: ${r.mobile.imageUrl} (${r.mobile.sheetSize.w}×${r.mobile.sheetSize.h})`
      );
      onSaved?.();
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { error?: string } } }).response?.data?.error
          : 'Xuất resize thất bại';
      setResizeError(msg || 'Xuất resize thất bại');
    } finally {
      setResizeExporting(false);
    }
  }, [selectedPath, canExportResize, onSaved]);

  const handleSave = useCallback(async () => {
    if (!selectedPath || !canSave) return;
    try {
      setSaving(true);
      setSaveError(null);
      setSaveOk(null);
      const result = await filesService.exportSpritesheetBestGrid(selectedPath);
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
  }, [selectedPath, canSave, onSaved]);

  return (
    <>
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 p-4"
      onClick={() => {
        if (!saving && !resizeExporting) onClose();
      }}
    >
      <Card
        className="relative w-full max-w-6xl overflow-hidden border bg-card shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        aria-busy={saving || resizeExporting}
      >
        <div aria-hidden={saving || resizeExporting}>
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <CardTitle className="text-lg font-semibold tracking-tight">Spritesheet edit</CardTitle>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className={cn(
                'h-9 w-9',
                canSave && !saving
                  ? 'text-sky-600 hover:bg-sky-500/10 hover:text-sky-700'
                  : 'text-muted-foreground'
              )}
              disabled={!canSave || saving || resizeExporting || !selectedPath}
              title={
                canSave
                  ? 'Lưu spritesheet bestGrid ra admin-web/public'
                  : 'Tỉ lệ bestGrid trùng ảnh gốc — không cần xuất'
              }
              onClick={() => void handleSave()}
            >
              <FontAwesomeIcon icon={faFloppyDisk} className="h-4 w-4" />
              <span className="sr-only">Lưu bestGrid</span>
            </Button>
            <Button variant="ghost" size="sm" type="button" disabled={saving || resizeExporting} onClick={onClose}>
              ✕
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Cây Spritesheet (trái) và Frames + tabs (phải) — cùng chiều cao 320px */}
          <div className="flex flex-col gap-3 lg:flex-row lg:items-stretch">
            <div
              className="flex w-full shrink-0 flex-col lg:w-64 xl:w-72"
              id="spritesheet-tree-wrap"
            >
              <label className="mb-1 block text-sm font-medium">images/Spritesheet</label>
              <SpritesheetFolderTree
                files={files}
                selectedPath={selectedPath}
                onSelect={(path) => setSelectedPath(path)}
                loading={filesLoading}
                className="h-[320px]"
              />
            </div>

            <div className="relative flex min-h-0 min-w-0 flex-1 flex-col">
              {!selectedPath ? (
                <>
                  <label className="mb-1 block text-sm font-medium">Frames</label>
                  <div
                    className="flex h-[320px] flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border bg-muted/40 px-4 text-center"
                    role="status"
                    aria-live="polite"
                  >
                    {filesLoading ? (
                      <>
                        <div
                          className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent"
                          aria-hidden
                        />
                        <p className="text-sm text-muted-foreground">Đang tải danh sách spritesheet…</p>
                      </>
                    ) : (
                      <>
                        <p className="text-sm font-medium text-foreground">Chưa chọn spritesheet</p>
                        <p className="max-w-sm text-xs text-muted-foreground">
                          Chọn một file trong cây{' '}
                          <span className="font-mono text-[11px]">images/Spritesheet</span> bên trái để
                          xem frame (350×590) và preview.
                        </p>
                      </>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <TabPanelLoading show={decodeLoading} label="Đang tải & cắt frame…" />
                  <label className="mb-1 block text-sm font-medium">
                    Frames ({frameCanvases.length})
                  </label>
                  <div className="mb-2 flex flex-wrap items-end justify-between gap-x-2 gap-y-1 border-b border-border">
                    <div
                      className="flex min-w-0 flex-wrap gap-0"
                      role="tablist"
                      aria-label="Spritesheet panels"
                    >
                      {(['collection', 'preview', 'json', 'resize'] as const).map((tab) => (
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
                    <button
                      type="button"
                      className={cn(
                        '-mb-px shrink-0 border-b-2 border-transparent px-2 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground'
                      )}
                      onClick={handleReset}
                    >
                      reset
                    </button>
                  </div>

                  <div
                    className={cn(
                      'flex h-[320px] min-w-0 flex-col overflow-hidden rounded-lg border',
                      panelTab === 'collection'
                        ? 'border-dashed border-border bg-muted'
                        : 'border-border bg-muted/50'
                    )}
                  >
                    {panelTab === 'collection' && (
                      <div className="min-h-0 flex-1 overflow-y-auto p-3">
                        {frameCanvases.length === 0 ? (
                          <p className="text-xs text-muted-foreground">
                            Không cắt được frame từ ảnh này.
                          </p>
                        ) : (
                          <div className="flex flex-wrap gap-2 content-start">
                            {frameCanvases.map((_, i) => (
                              <div
                                key={i}
                                className="cursor-zoom-in overflow-hidden rounded-md border border-border bg-background"
                                style={{ width: 70, height: Math.round(70 * (FH / FW)) }}
                                title="Double-click để xem toàn màn hình"
                                onDoubleClick={(e) => {
                                  e.stopPropagation();
                                  const src = frameThumbnailDataUrls[i];
                                  if (!src) return;
                                  setLightboxFrame({
                                    src,
                                    alt: `Frame ${i} (${FW}×${FH})`,
                                  });
                                }}
                              >
                                <img
                                  src={frameThumbnailDataUrls[i]}
                                  alt={`frame ${i}`}
                                  className="pointer-events-none h-full w-full object-cover object-top select-none"
                                  draggable={false}
                                />
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {panelTab === 'preview' && (
                      <div className="flex min-h-0 flex-1 flex-col gap-2 p-2">
                        <div className="flex flex-wrap gap-1">
                          <Button
                            type="button"
                            size="sm"
                            variant={previewLayout === 'bestGrid' ? 'default' : 'outline'}
                            className="h-7 text-xs"
                            onClick={() => setPreviewLayout('bestGrid')}
                          >
                            bestGrid
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant={previewLayout === 'original' ? 'default' : 'outline'}
                            className="h-7 text-xs"
                            onClick={() => setPreviewLayout('original')}
                          >
                            Gốc
                          </Button>
                        </div>
                        <div
                          ref={previewWrapRef}
                          className="flex min-h-0 flex-1 items-center justify-center overflow-auto"
                        >
                          {previewLayout === 'original' && sourceImage && sourceDims ? (
                            <img
                              src={selectedPath ?? undefined}
                              alt="Spritesheet gốc"
                              className="max-h-[280px] max-w-full rounded border border-border object-contain"
                            />
                          ) : previewLayout === 'bestGrid' && frameCanvases.length > 0 && gridInfo ? (
                            <canvas
                              ref={previewCanvasRef}
                              className="max-h-[280px] w-auto max-w-full rounded border border-border bg-black/20"
                              aria-label="Preview bestGrid"
                            />
                          ) : (
                            <p className="text-xs text-muted-foreground">Không có dữ liệu preview.</p>
                          )}
                        </div>
                      </div>
                    )}

                    {panelTab === 'json' && (
                      <div className="flex min-h-0 flex-1 flex-col overflow-hidden p-2">
                        {!simulatedAtlas ? (
                          <p className="text-xs text-muted-foreground">Chưa có frame để dựng JSON giả lập.</p>
                        ) : (
                          <JsonRawHighlight
                            data={simulatedAtlas.metadata}
                            className="!max-h-[280px]"
                          />
                        )}
                      </div>
                    )}

                    {panelTab === 'resize' && (
                      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-3">
                        <p className="text-xs leading-relaxed text-muted-foreground">
                          Cắt từng frame {FW}×{FH}, resize stretch (Sharp <span className="font-mono">fit: &apos;fill&apos;</span>)
                          rồi ghép bestGrid — không thu nhỏ trực tiếp cả spritesheet gốc.                           Desktop:{' '}
                          <span className="font-medium text-foreground">210×360</span> / frame · Mobile:{' '}
                          <span className="font-medium text-foreground">105×180</span> / frame. File ghi vào{' '}
                          <span className="font-mono text-[11px]">server/uploads/resize/desktop/</span> và{' '}
                          <span className="font-mono text-[11px]">server/uploads/resize/mobile/</span> — cùng tên file gốc{' '}
                          <span className="font-mono text-[11px]">{'{basename}'}.webp</span>.
                        </p>
                        <div className="flex flex-wrap items-center gap-2">
                          <Button
                            type="button"
                            size="sm"
                            className="h-8"
                            disabled={!canExportResize || resizeExporting}
                            onClick={() => void handleExportResize()}
                          >
                            Xuất desktop + mobile
                          </Button>
                        </div>
                        {resizeError && (
                          <p className="text-xs font-medium text-destructive">{resizeError}</p>
                        )}
                        {resizeOk && (
                          <p className="break-all text-xs font-medium text-emerald-600">{resizeOk}</p>
                        )}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>

          {sourceDims && gridInfo && (
            <p className="text-xs text-muted-foreground">
              Ảnh gốc: {sourceDims.w}×{sourceDims.h} · bestGrid sheet: {gridInfo.sheetWidth}×
              {gridInfo.sheetHeight} · tỉ lệ gốc {(sourceDims.w / sourceDims.h).toFixed(4)} vs bestGrid{' '}
              {(gridInfo.sheetWidth / gridInfo.sheetHeight).toFixed(4)}
            </p>
          )}
          {saveError && (
            <p className="text-xs font-medium text-destructive">{saveError}</p>
          )}
          {saveOk && <p className="text-xs font-medium text-emerald-600">{saveOk}</p>}
        </CardContent>
        </div>

        <AssetLoadingOverlay
          show={saving || resizeExporting}
          variant="modal"
          label={
            resizeExporting
              ? 'Đang xuất resize (desktop + mobile) trên server…'
              : 'Đang lưu và xử lý ảnh trên server…'
          }
          subLabel="Vui lòng chờ phản hồi."
        />
      </Card>
    </div>

    <ImageLightbox
      open={lightboxFrame}
      onClose={() => setLightboxFrame(null)}
      dialogLabel="Frame spritesheet"
      className="z-[10000]"
    />
    </>
  );
}
