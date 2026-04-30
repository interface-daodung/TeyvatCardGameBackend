import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
} from 'react';
import ReactFlow, {
  applyEdgeChanges,
  applyNodeChanges,
  Background,
  Controls,
  MarkerType,
  MiniMap,
  type Edge,
  type EdgeChange,
  type Node,
  type NodeChange,
  type ReactFlowInstance,
} from 'reactflow';
import 'reactflow/dist/style.css';
import type { FieldTypeSummary } from '../../services/databaseManagementService';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import {
  buildFieldPathGraph,
  collectGraphPathsFromLeafSummaries,
  layoutFieldPathNodes,
  splitFieldPath,
} from './fieldPathTreeUtils';

const FLOW_WARN_NODES = 500;

function lastSegment(path: string): string {
  const segs = splitFieldPath(path);
  return segs.length ? segs[segs.length - 1] : path;
}

/** Một vòng màu theo độ sâu (segment), node lá có viền accent đậm hơn. */
const DEPTH_SWATCHES: ReadonlyArray<{
  bg: string;
  fg: string;
  border: string;
  accent: string;
}> = [
  { bg: '#eff6ff', fg: '#1e3a8a', border: '#93c5fd', accent: '#2563eb' },
  { bg: '#ecfdf5', fg: '#065f46', border: '#6ee7b7', accent: '#059669' },
  { bg: '#fffbeb', fg: '#92400e', border: '#fcd34d', accent: '#d97706' },
  { bg: '#faf5ff', fg: '#6b21a8', border: '#d8b4fe', accent: '#9333ea' },
  { bg: '#fff1f2', fg: '#9f1239', border: '#fda4af', accent: '#e11d48' },
  { bg: '#ecfeff', fg: '#155e75', border: '#67e8f9', accent: '#0891b2' },
];

function nodeStyleForPath(path: string, selected: boolean, isLeaf: boolean): Node['style'] {
  const depth = splitFieldPath(path).length;
  const sw = DEPTH_SWATCHES[(Math.max(1, depth) - 1) % DEPTH_SWATCHES.length];
  const selectedBg = '#e0e7ff';
  const selectedFg = '#1e1b4b';
  const border = selected
    ? '2px solid #6366f1'
    : isLeaf
      ? `2px solid ${sw.accent}`
      : `1px solid ${sw.border}`;
  return {
    background: selected ? selectedBg : sw.bg,
    color: selected ? selectedFg : sw.fg,
    border,
    borderRadius: 8,
    fontSize: 11,
    fontWeight: isLeaf ? 600 : 500,
    padding: '8px 10px',
    width: 200,
    textAlign: 'left' as const,
    boxShadow: isLeaf ? '0 1px 3px rgb(15 23 42 / 0.12)' : '0 1px 2px rgb(15 23 42 / 0.06)',
  };
}

type FieldPathFlowPanelProps = {
  filteredFieldSummaries: FieldTypeSummary[];
  sampleUsed: number;
  pathToSummary: Map<string, FieldTypeSummary>;
};

export function FieldPathFlowPanel({
  filteredFieldSummaries,
  sampleUsed,
  pathToSummary,
}: FieldPathFlowPanelProps) {
  const pathSet = useMemo(
    () => collectGraphPathsFromLeafSummaries(filteredFieldSummaries),
    [filteredFieldSummaries]
  );

  const { nodeIds, edges: rawEdges } = useMemo(() => buildFieldPathGraph(pathSet), [pathSet]);

  const positions = useMemo(
    () => layoutFieldPathNodes(nodeIds, { stepX: 230, stepY: 100 }),
    [nodeIds]
  );

  const graphKey = useMemo(() => nodeIds.join('|'), [nodeIds]);

  const leafPathSet = useMemo(
    () => new Set(filteredFieldSummaries.map((s) => s.path)),
    [filteredFieldSummaries]
  );

  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [flowNodes, setFlowNodes] = useState<Node[]>([]);
  const [flowEdges, setFlowEdges] = useState<Edge[]>([]);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isDrawMode, setIsDrawMode] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const [strokes, setStrokes] = useState<Array<Array<{ x: number; y: number }>>>([]);
  const [currentStroke, setCurrentStroke] = useState<Array<{ x: number; y: number }>>([]);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const flowCanvasRef = useRef<HTMLDivElement | null>(null);
  const rfInstanceRef = useRef<ReactFlowInstance | null>(null);

  const staticEdges = useMemo(
    () =>
      rawEdges.map((e, i) => ({
        id: `e-${i}-${e.from}->${e.to}`,
        source: e.from,
        target: e.to,
        markerEnd: { type: MarkerType.ArrowClosed, color: '#64748b' },
        style: { stroke: '#94a3b8', strokeWidth: 1.2 },
      })),
    [rawEdges]
  );

  useEffect(() => {
    setFlowNodes(
      nodeIds.map((id) => {
        const pos = positions.get(id) ?? { x: 0, y: 0 };
        const selected = id === selectedPath;
        const isLeaf = leafPathSet.has(id);
        return {
          id,
          position: pos,
          data: { label: lastSegment(id), fullPath: id, isLeaf },
          style: nodeStyleForPath(id, selected, isLeaf),
        };
      })
    );
    setFlowEdges(staticEdges);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- chỉ reset khi cấu trúc đồ thị đổi; không gắn selectedPath/leafPathSet để giữ vị trí kéo
  }, [graphKey, nodeIds, positions, staticEdges]);

  useEffect(() => {
    setFlowNodes((prev) => {
      if (prev.length === 0) return prev;
      return prev.map((n) => ({
        ...n,
        data: {
          label: lastSegment(n.id),
          fullPath: n.id,
          isLeaf: leafPathSet.has(n.id),
        },
        style: nodeStyleForPath(n.id, n.id === selectedPath, leafPathSet.has(n.id)),
      }));
    });
  }, [selectedPath, leafPathSet]);

  const onInit = useCallback((instance: ReactFlowInstance) => {
    rfInstanceRef.current = instance;
    requestAnimationFrame(() => instance.fitView({ padding: 0.18 }));
  }, []);

  useEffect(() => {
    const inst = rfInstanceRef.current;
    if (!inst) return;
    const id = requestAnimationFrame(() => inst.fitView({ padding: 0.18 }));
    return () => cancelAnimationFrame(id);
  }, [graphKey, staticEdges.length]);

  const onNodesChange = useCallback((changes: NodeChange[]) => {
    setFlowNodes((prev) => applyNodeChanges(changes, prev));
  }, []);

  const onEdgesChange = useCallback((changes: EdgeChange[]) => {
    setFlowEdges((prev) => applyEdgeChanges(changes, prev));
  }, []);

  const getPointFromEvent = (event: ReactMouseEvent<Element>) => {
    const rect = flowCanvasRef.current?.getBoundingClientRect();
    if (!rect) return null;
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  };

  const toSvgPath = (points: Array<{ x: number; y: number }>) => {
    if (points.length === 0) return '';
    if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;
    let path = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length - 1; i++) {
      const current = points[i];
      const next = points[i + 1];
      const cx = (current.x + next.x) / 2;
      const cy = (current.y + next.y) / 2;
      path += ` Q ${current.x} ${current.y} ${cx} ${cy}`;
    }
    const last = points[points.length - 1];
    path += ` L ${last.x} ${last.y}`;
    return path;
  };

  const onPaneMouseDown = (event: ReactMouseEvent<Element>) => {
    if (!isDrawMode) return;
    const point = getPointFromEvent(event);
    if (!point) return;
    setIsDrawing(true);
    setCurrentStroke([point]);
  };

  const onPaneMouseMove = (event: ReactMouseEvent<Element>) => {
    if (!isDrawMode || !isDrawing) return;
    const point = getPointFromEvent(event);
    if (!point) return;
    setCurrentStroke((prev) => [...prev, point]);
  };

  const stopDrawing = () => {
    if (!isDrawMode || !isDrawing) return;
    setIsDrawing(false);
    setStrokes((prev) => (currentStroke.length > 1 ? [...prev, currentStroke] : prev));
    setCurrentStroke([]);
  };

  const clearDraw = () => {
    setStrokes([]);
    setCurrentStroke([]);
    setIsDrawing(false);
  };

  const toggleFullscreen = async () => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
        return;
      }
      await containerRef.current?.requestFullscreen();
    } catch {
      // ignore fullscreen API errors
    }
  };

  useEffect(() => {
    const onFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', onFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', onFullscreenChange);
    };
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.code === 'CapsLock') {
        event.preventDefault();
        setIsDrawMode((prev) => !prev);
        return;
      }
      const isClearDrawShortcut =
        (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'd';
      if (isClearDrawShortcut) {
        event.preventDefault();
        clearDraw();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const onNodeClick = useCallback((_evt: ReactMouseEvent, node: Node) => {
    setSelectedPath(node.id);
  }, []);

  const selectedSummary = selectedPath ? pathToSummary.get(selectedPath) ?? null : null;

  if (filteredFieldSummaries.length === 0) {
    return <p className="text-sm text-muted-foreground py-6 text-center">Không tìm thấy field nào phù hợp.</p>;
  }

  const nodeCount = nodeIds.length;

  return (
    <div className="space-y-3">
      {nodeCount > FLOW_WARN_NODES && (
        <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          Đồ thị lớn ({nodeCount} node). Nên thu hẹp <strong>Search field path</strong> để mượt hơn.
        </p>
      )}
      <p className="text-xs text-slate-500">
        Quan hệ <strong>cha → con</strong> theo prefix path MongoDB. Bấm node để xem chi tiết scan. Màu nền theo{' '}
        <strong>độ sâu</strong> path (lặp theo chu kỳ); node <strong>lá</strong> (field có trong mẫu) có viền accent
        đậm và chữ đậm hơn. Kéo node để sắp xếp;{' '}
        <kbd className="rounded border border-slate-300 bg-slate-100 px-1">CapsLock</kbd> bật/tắt vẽ tay; Ctrl/Cmd+D
        xóa nét.
      </p>
      <div ref={containerRef} className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
        <div className="flex justify-end">
          <div className="flex flex-wrap items-center gap-2">
            <Button
              onClick={() => setIsDrawMode((v) => !v)}
              className={
                isDrawMode ? 'bg-amber-600 hover:bg-amber-700 text-white' : 'bg-slate-600 hover:bg-slate-700 text-white'
              }
              type="button"
            >
              {isDrawMode ? 'Disable free draw' : 'Free draw'}
            </Button>
            <Button
              onClick={clearDraw}
              className="bg-slate-500 hover:bg-slate-600 text-white"
              type="button"
              disabled={strokes.length === 0 && currentStroke.length === 0}
            >
              Xóa nét
            </Button>
            <Button
              onClick={toggleFullscreen}
              className="bg-slate-600 hover:bg-slate-700 text-white"
              type="button"
            >
              {isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
            </Button>
          </div>
        </div>
        <div
          ref={flowCanvasRef}
          className={`w-full overflow-hidden rounded-md border border-slate-200 bg-white ${
            isFullscreen ? 'h-screen' : 'h-[min(52vh,520px)] min-h-[320px]'
          }`}
          onMouseDown={onPaneMouseDown}
          onMouseMove={onPaneMouseMove}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
        >
          <div className="relative h-full w-full">
            <ReactFlow
              nodes={flowNodes}
              edges={flowEdges}
              onInit={onInit}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onNodeClick={onNodeClick}
              fitView
              fitViewOptions={{ padding: 0.18 }}
              minZoom={0.08}
              maxZoom={1.5}
              panOnScroll={!isDrawMode}
              nodesDraggable={!isDrawMode}
              nodesConnectable={false}
              elementsSelectable={!isDrawMode}
              proOptions={{ hideAttribution: true }}
            >
              <Background gap={14} size={1} color="#e2e8f0" />
              <Controls />
              <MiniMap
                nodeStrokeWidth={3}
                zoomable
                pannable
                maskColor="rgb(241 245 249 / 0.85)"
                className="!bg-white/90"
              />
            </ReactFlow>
            <svg className="pointer-events-none absolute inset-0 h-full w-full">
              {strokes.map((stroke, index) => (
                <path
                  key={`stroke-${index}`}
                  d={toSvgPath(stroke)}
                  fill="none"
                  stroke="#ef4444"
                  strokeWidth={2.5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  opacity={0.95}
                />
              ))}
              {currentStroke.length > 1 && (
                <path
                  d={toSvgPath(currentStroke)}
                  fill="none"
                  stroke="#f97316"
                  strokeWidth={2.5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  opacity={0.9}
                />
              )}
            </svg>
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-4 space-y-2">
        <h4 className="text-sm font-semibold text-slate-800">Chi tiết node</h4>
        {!selectedPath ? (
          <p className="text-sm text-slate-500">Chưa chọn node — bấm một ô trên lưới.</p>
        ) : (
          <>
            <p className="text-xs font-mono text-slate-700 break-all bg-slate-50 rounded px-2 py-1.5 border border-slate-100">
              {selectedPath}
            </p>
            {selectedSummary ? (
              <div className="space-y-2 text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    {selectedSummary.typeCount} types
                  </Badge>
                  <span className="text-slate-600">{selectedSummary.types.join(', ')}</span>
                </div>
                <p className="text-slate-700">
                  Docs có path:{' '}
                  <span className="font-semibold">
                    {selectedSummary.docsWithPath}/{sampleUsed}
                  </span>
                </p>
                {selectedSummary.examples.length > 0 ? (
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase mb-1">Examples</p>
                    <div className="flex flex-wrap gap-2">
                      {selectedSummary.examples.map((ex) => (
                        <span
                          key={ex}
                          className="inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-700 max-w-full truncate"
                          title={ex}
                        >
                          {ex}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-slate-500">Không có ví dụ giá trị (object/array).</p>
                )}
              </div>
            ) : (
              <p className="text-sm text-slate-600">
                Path trung gian (chỉ xuất hiện vì là tiền tố của field khác) — không có bản ghi riêng trong snapshot cho
                đúng path này, hoặc chưa được scan trên mẫu.
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
