import { useEffect, useMemo, useRef, useState } from 'react';
import { faPenToSquare } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { filesService } from '../../services/filesService';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { cn } from '../../lib/utils';
import { JsonRawHighlight } from './JsonRawHighlight';
import { bestGrid } from './atlasPreviewUtils';

type AnimationFileItem = { path: string; name: string };
type AtlasPanelTab = 'collection' | 'preview' | 'json';
type SelectedItem = { path: string; fileName: string; alias: string };

const FRAME = 192;
const NAME_RE = /^[a-zA-Z0-9_-]{1,50}$/;

function basenameNoExt(p: string): string {
  return (p.split(/[/\\]/).pop() ?? 'animation').replace(/\.[^.]+$/, '') || 'animation';
}

function drawImageCover(
  ctx: CanvasRenderingContext2D,
  img: CanvasImageSource,
  dx: number,
  dy: number,
  dw: number,
  dh: number
) {
  const sw = img instanceof HTMLImageElement ? img.naturalWidth : (img as HTMLCanvasElement).width;
  const sh = img instanceof HTMLImageElement ? img.naturalHeight : (img as HTMLCanvasElement).height;
  if (!sw || !sh) return;
  const scale = Math.max(dw / sw, dh / sh);
  const scaledW = sw * scale;
  const scaledH = sh * scale;
  const offsetX = dx + (dw - scaledW) / 2;
  const offsetY = dy + (dh - scaledH) / 2;
  ctx.drawImage(img, offsetX, offsetY, scaledW, scaledH);
}

async function decodeNonEmptyFrames(items: SelectedItem[]): Promise<{ key: string; canvas: HTMLCanvasElement }[]> {
  const out: { key: string; canvas: HTMLCanvasElement }[] = [];
  for (const item of items) {
    const image = await new Promise<HTMLImageElement | null>((resolve) => {
      const im = new Image();
      im.crossOrigin = 'anonymous';
      im.onload = () => resolve(im);
      im.onerror = () => resolve(null);
      im.src = item.path;
    });
    if (!image) continue;
    const cols = Math.floor(image.naturalWidth / FRAME);
    const rows = Math.floor(image.naturalHeight / FRAME);
    if (cols < 1 || rows < 1) continue;
    let idx = 0;
    for (let i = 0; i < cols * rows; i++) {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const c = document.createElement('canvas');
      c.width = FRAME;
      c.height = FRAME;
      const cctx = c.getContext('2d');
      if (!cctx) continue;
      cctx.clearRect(0, 0, FRAME, FRAME);
      cctx.drawImage(image, col * FRAME, row * FRAME, FRAME, FRAME, 0, 0, FRAME, FRAME);
      const data = cctx.getImageData(0, 0, FRAME, FRAME).data;
      let nonEmpty = false;
      for (let p = 3; p < data.length; p += 4) {
        if (data[p] !== 0) {
          nonEmpty = true;
          break;
        }
      }
      if (!nonEmpty) continue;
      const padded = idx.toString().padStart(2, '0');
      out.push({ key: `${item.alias}_${padded}`, canvas: c });
      idx += 1;
    }
  }
  return out;
}

export function AtlasAnimationModal({
  files,
  onClose,
  onCreated,
}: {
  files: AnimationFileItem[];
  onClose: () => void;
  onCreated: () => void;
}) {
  const [panelTab, setPanelTab] = useState<AtlasPanelTab>('collection');
  const [selected, setSelected] = useState<SelectedItem[]>([]);
  const [editingPath, setEditingPath] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [atlasName, setAtlasName] = useState('animation-atlas');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [decodedFrames, setDecodedFrames] = useState<{ key: string; canvas: HTMLCanvasElement }[]>([]);
  const [decoding, setDecoding] = useState(false);

  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const previewWrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    setDecoding(true);
    void decodeNonEmptyFrames(selected).then((frames) => {
      if (cancelled) return;
      setDecodedFrames(frames);
      setDecoding(false);
    });
    return () => {
      cancelled = true;
    };
  }, [selected]);

  const gridInfo = useMemo(() => {
    if (decodedFrames.length === 0) return null;
    return bestGrid(decodedFrames.length, FRAME, FRAME);
  }, [decodedFrames]);

  const jsonPreview = useMemo(() => {
    if (!gridInfo) return null;
    const frames: Record<string, { frame: { x: number; y: number; w: number; h: number } }> = {};
    decodedFrames.forEach((f, index) => {
      const row = Math.floor(index / gridInfo.columns);
      const col = index % gridInfo.columns;
      frames[f.key] = { frame: { x: col * FRAME, y: row * FRAME, w: FRAME, h: FRAME } };
    });
    return {
      frames,
      meta: {
        image: `${atlasName}.webp`,
        size: { w: gridInfo.sheetWidth, h: gridInfo.sheetHeight },
        scale: '1',
        path: `assets/images/animations/${atlasName}.webp`,
        hasAnimation: true,
      },
    };
  }, [decodedFrames, gridInfo, atlasName]);

  useEffect(() => {
    if (panelTab !== 'preview' || !gridInfo) return;
    const canvas = previewCanvasRef.current;
    const wrap = previewWrapRef.current;
    if (!canvas || !wrap) return;
    const maxDisplayW = Math.max(1, wrap.clientWidth);
    const maxDisplayH = 280;
    const fit = Math.min(1, maxDisplayW / gridInfo.sheetWidth, maxDisplayH / gridInfo.sheetHeight);
    const cw = Math.max(1, Math.floor(gridInfo.sheetWidth * fit));
    const ch = Math.max(1, Math.floor(gridInfo.sheetHeight * fit));
    canvas.width = cw;
    canvas.height = ch;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, cw, ch);
    ctx.save();
    ctx.scale(fit, fit);
    decodedFrames.forEach((f, index) => {
      const row = Math.floor(index / gridInfo.columns);
      const col = index % gridInfo.columns;
      drawImageCover(ctx, f.canvas, col * FRAME, row * FRAME, FRAME, FRAME);
    });
    ctx.restore();
  }, [panelTab, gridInfo, decodedFrames]);

  const selectedPaths = useMemo(() => new Set(selected.map((s) => s.path)), [selected]);
  const canSubmit = NAME_RE.test(atlasName.trim()) && selected.length > 0 && !submitting;

  const addFile = (f: AnimationFileItem) => {
    if (selectedPaths.has(f.path)) return;
    const alias = basenameNoExt(f.name);
    setSelected((prev) => [...prev, { path: f.path, fileName: f.name, alias }]);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const path = e.dataTransfer.getData('text/plain');
    if (!path) return;
    const f = files.find((x) => x.path === path);
    if (f) addFile(f);
  };

  const saveAlias = (path: string) => {
    const name = editValue.trim();
    if (!NAME_RE.test(name)) return;
    setSelected((prev) => prev.map((s) => (s.path === path ? { ...s, alias: name } : s)));
    setEditingPath(null);
    setEditValue('');
  };

  const handleCreate = async () => {
    if (!canSubmit) return;
    try {
      setSubmitting(true);
      setError(null);
      await filesService.generateAnimationAtlas(
        selected.map((s) => ({ path: s.path, name: s.alias })),
        atlasName.trim()
      );
      onCreated();
      onClose();
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { error?: string } } }).response?.data?.error
          : 'Tạo atlas animation thất bại';
      setError(msg || 'Tạo atlas animation thất bại');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <Card className="w-full max-w-6xl border bg-card shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <CardTitle className="text-lg font-semibold tracking-tight">Atlas Animation</CardTitle>
          <Button variant="ghost" size="sm" type="button" onClick={onClose}>✕</Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-4 lg:flex-row">
            <div className="min-w-0 flex-1">
              <div className="mb-2 flex flex-wrap items-end justify-between gap-x-2 gap-y-1 border-b border-border">
                <div className="flex min-w-0 flex-wrap gap-0" role="tablist">
                  {(['collection', 'preview', 'json'] as const).map((tab) => (
                    <button
                      key={tab}
                      type="button"
                      role="tab"
                      aria-selected={panelTab === tab}
                      className={cn(
                        '-mb-px border-b-2 px-2 py-1.5 text-xs font-medium transition-colors',
                        panelTab === tab ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'
                      )}
                      onClick={() => setPanelTab(tab)}
                    >
                      {tab}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  className="-mb-px border-b-2 border-transparent px-2 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
                  onClick={() => setSelected([])}
                >
                  reset
                </button>
              </div>

              <div className={cn('h-[340px] overflow-hidden rounded-lg border', panelTab === 'collection' ? 'border-dashed border-border bg-muted' : 'border-border bg-muted/50')}>
                {panelTab === 'collection' && (
                  <div className="flex h-full min-h-0 flex-wrap content-start gap-2 overflow-y-auto p-3" onDragOver={(e) => e.preventDefault()} onDrop={handleDrop}>
                    {selected.length === 0 && <p className="text-xs text-muted-foreground">Kéo thả file từ danh sách animations bên phải vào đây.</p>}
                    {selected.map((s) => (
                      <div key={s.path} className="relative h-28 w-24 overflow-hidden rounded-md border border-border bg-background">
                        <img src={s.path} alt={s.fileName} className="h-20 w-full object-cover object-top" />
                        <button type="button" className="absolute right-1 top-1 rounded-full bg-black/60 px-1 text-[10px] text-white" onClick={() => setSelected((prev) => prev.filter((x) => x.path !== s.path))}>✕</button>
                        <button
                          type="button"
                          className="absolute right-1 top-5 rounded-full bg-black/60 px-1 text-[10px] text-white"
                          onClick={() => {
                            setEditingPath(s.path);
                            setEditValue(s.alias);
                          }}
                          title="Edit animation name"
                        >
                          <FontAwesomeIcon icon={faPenToSquare} />
                        </button>
                        <div className="px-1 py-0.5">
                          {editingPath === s.path ? (
                            <input
                              autoFocus
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              onBlur={() => saveAlias(s.path)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') saveAlias(s.path);
                                if (e.key === 'Escape') setEditingPath(null);
                              }}
                              className="w-full rounded border border-input bg-background px-1 py-0.5 text-[10px]"
                            />
                          ) : (
                            <p className="truncate text-[10px] text-foreground">{s.alias}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {panelTab === 'preview' && (
                  <div ref={previewWrapRef} className="flex h-full min-h-0 flex-col items-center justify-center overflow-auto p-2">
                    {decoding ? (
                      <p className="text-xs text-muted-foreground">Đang cắt frame 192×192 và lọc frame rỗng...</p>
                    ) : decodedFrames.length === 0 ? (
                      <p className="text-xs text-muted-foreground">Chưa có frame hợp lệ.</p>
                    ) : (
                      <canvas ref={previewCanvasRef} className="max-h-[300px] w-auto max-w-full rounded border border-border bg-black/20" />
                    )}
                  </div>
                )}

                {panelTab === 'json' && (
                  <div className="h-full min-h-0 overflow-hidden p-2">
                    {jsonPreview ? (
                      <JsonRawHighlight data={jsonPreview} className="!max-h-[280px]" />
                    ) : (
                      <p className="text-xs text-muted-foreground">Chưa có dữ liệu JSON.</p>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="w-full shrink-0 lg:w-80">
              <label className="mb-1 block text-sm font-medium">animations ({files.length})</label>
              <div className="max-h-[340px] overflow-y-auto rounded-lg border border-border bg-muted/40 p-2">
                <div className="grid grid-cols-4 gap-2">
                  {files.map((f) => (
                    <button
                      key={f.path}
                      type="button"
                      className={cn(
                        'overflow-hidden rounded-md border border-border bg-card',
                        selectedPaths.has(f.path) ? 'opacity-50' : 'hover:ring-2 hover:ring-primary/60'
                      )}
                      draggable={!selectedPaths.has(f.path)}
                      onDragStart={(e) => e.dataTransfer.setData('text/plain', f.path)}
                      onClick={() => addFile(f)}
                    >
                      <img src={f.path} alt={f.name} className="h-12 w-full object-cover object-top" />
                      <span className="block truncate px-1 py-0.5 text-[10px] text-muted-foreground">{f.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-2 border-t border-border pt-3">
            <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div className="min-w-0 flex-1">
                <label className="block text-sm font-medium">atlas name</label>
                <input
                  type="text"
                  value={atlasName}
                  onChange={(e) => setAtlasName(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={onClose}>Hủy</Button>
                <Button type="button" onClick={() => void handleCreate()} disabled={!canSubmit}>
                  {submitting ? 'Đang tạo...' : 'Tạo atlas'}
                </Button>
              </div>
            </div>
            {error && <p className="text-xs font-medium text-destructive">{error}</p>}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

