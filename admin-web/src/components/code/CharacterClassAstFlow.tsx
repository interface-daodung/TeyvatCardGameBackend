import { useEffect, useMemo, useRef, useState, type MouseEvent as ReactMouseEvent } from 'react';
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
} from 'reactflow';
import 'reactflow/dist/style.css';
import type { CharacterClassAstMapResult, ClassMethodAstNode } from '../../services/filesService';
import { Button } from '../ui/button';

interface CharacterClassAstFlowProps {
  loading: boolean;
  error: string | null;
  astMapData: CharacterClassAstMapResult | null;
  classRelativePath: string;
}

function formatMethodNodeLabel(method: ClassMethodAstNode): string {
  const args = method.parameters.join(', ');
  if (method.kind === 'constructor') return `constructor(${args})`;
  const returnType = method.returnType ? `: ${method.returnType}` : '';
  return `${method.kind} ${method.name}(${args})${returnType}`;
}

export function CharacterClassAstFlow({
  loading,
  error,
  astMapData,
  classRelativePath,
}: CharacterClassAstFlowProps) {
  const [flowNodes, setFlowNodes] = useState<Node[]>([]);
  const [flowEdges, setFlowEdges] = useState<Edge[]>([]);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isDrawMode, setIsDrawMode] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const [strokes, setStrokes] = useState<Array<Array<{ x: number; y: number }>>>([]);
  const [currentStroke, setCurrentStroke] = useState<Array<{ x: number; y: number }>>([]);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const flowCanvasRef = useRef<HTMLDivElement | null>(null);

  const astFlow = useMemo(() => {
    if (!astMapData) return null;
    const classMethods = astMapData.methodMap[astMapData.className] ?? [];
    const parentMethods = astMapData.methodMap[astMapData.parentClassName] ?? [];
    const nodes: Node[] = [];
    const edges: Edge[] = [];

    nodes.push(
      {
        id: `class-${astMapData.parentClassName}`,
        position: { x: 20, y: 20 },
        data: { label: `${astMapData.parentClassName} (parent)` },
        style: {
          background: '#eff6ff',
          color: '#1e3a8a',
          border: '1px solid #93c5fd',
          width: 260,
          fontSize: 12,
        },
      },
      {
        id: `class-${astMapData.className}`,
        position: { x: 340, y: 20 },
        data: { label: `${astMapData.className} (current)` },
        style: {
          background: '#ecfdf5',
          color: '#065f46',
          border: '1px solid #6ee7b7',
          width: 260,
          fontSize: 12,
        },
      }
    );

    edges.push({
      id: `inherit-${astMapData.className}`,
      source: `class-${astMapData.className}`,
      target: `class-${astMapData.parentClassName}`,
      label: 'extends',
      markerEnd: { type: MarkerType.ArrowClosed, color: '#f59e0b' },
      style: { stroke: '#f59e0b', strokeWidth: 1.5 },
      labelStyle: { fill: '#f59e0b', fontSize: 11 },
    });

    parentMethods.forEach((method, index) => {
      const id = `parent-method-${index}`;
      nodes.push({
        id,
        position: { x: 20, y: 95 + index * 56 },
        data: { label: formatMethodNodeLabel(method) },
        style: {
          background: '#f8fafc',
          color: '#0f172a',
          border: '1px solid #cbd5e1',
          width: 260,
          fontSize: 11,
          padding: '8px 10px',
        },
      });
      edges.push({
        id: `parent-link-${index}`,
        source: `class-${astMapData.parentClassName}`,
        target: id,
        markerEnd: { type: MarkerType.ArrowClosed, color: '#64748b' },
        style: { stroke: '#64748b', strokeWidth: 1.2 },
      });
    });

    const parentMethodIdByName = new Map<string, string>();
    parentMethods.forEach((method, index) => {
      const id = `parent-method-${index}`;
      if (!parentMethodIdByName.has(method.name)) {
        parentMethodIdByName.set(method.name, id);
      }
    });

    classMethods.forEach((method, index) => {
      const id = `class-method-${index}`;
      nodes.push({
        id,
        position: { x: 340, y: 95 + index * 56 },
        data: { label: formatMethodNodeLabel(method) },
        style: {
          background: '#f0fdfa',
          color: '#134e4a',
          border: '1px solid #99f6e4',
          width: 260,
          fontSize: 11,
          padding: '8px 10px',
        },
      });
      edges.push({
        id: `class-link-${index}`,
        source: `class-${astMapData.className}`,
        target: id,
        markerEnd: { type: MarkerType.ArrowClosed, color: '#14b8a6' },
        style: { stroke: '#14b8a6', strokeWidth: 1.2 },
      });

      const parentMethodId = parentMethodIdByName.get(method.name);
      if (parentMethodId) {
        edges.push({
          id: `override-${method.name}-${index}`,
          source: id,
          target: parentMethodId,
          label: 'override',
          markerEnd: { type: MarkerType.ArrowClosed, color: '#8b5cf6' },
          style: { stroke: '#8b5cf6', strokeWidth: 1.4, strokeDasharray: '6 4' },
          labelStyle: { fill: '#7c3aed', fontSize: 10 },
        });
      }
    });

    return { nodes, edges };
  }, [astMapData]);

  useEffect(() => {
    if (!astFlow) {
      setFlowNodes([]);
      setFlowEdges([]);
      return;
    }
    setFlowNodes(astFlow.nodes);
    setFlowEdges(astFlow.edges);
  }, [astFlow, astMapData, loading, error]);

  const onNodesChange = (changes: NodeChange[]) => {
    setFlowNodes((prev) => applyNodeChanges(changes, prev));
  };

  const onEdgesChange = (changes: EdgeChange[]) => {
    setFlowEdges((prev) => applyEdgeChanges(changes, prev));
  };

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
      // ignore fullscreen API errors silently
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

  return (
    <div className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
      <p className="text-sm font-semibold text-slate-700">AST method map {classRelativePath.replace('/', '-')}</p>
      {loading && <p className="text-sm text-slate-500">Analyzing AST with ts-morph...</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}
      {!loading && !error && astMapData && astFlow && (
        <div ref={containerRef} className="space-y-2">
          <div className="flex justify-end">
            <div className="flex items-center gap-2">
              <Button
                onClick={() => setIsDrawMode((v) => !v)}
                className={isDrawMode ? 'bg-amber-600 hover:bg-amber-700 text-white' : 'bg-slate-600 hover:bg-slate-700 text-white'}
                type="button"
              >
                {isDrawMode ? 'Disable Draw' : 'Freehand Draw'}
              </Button>
              <Button
                onClick={clearDraw}
                className="bg-slate-500 hover:bg-slate-600 text-white"
                type="button"
                disabled={strokes.length === 0 && currentStroke.length === 0}
              >
                Clear Draw
              </Button>
              <Button
                onClick={toggleFullscreen}
                className="bg-slate-600 hover:bg-slate-700 text-white"
                type="button"
              >
                {isFullscreen ? 'Exit full screen' : 'Full screen'}
              </Button>
            </div>
          </div>
          <div
            ref={flowCanvasRef}
            className={`w-full overflow-hidden rounded-md border border-slate-200 bg-white ${
              isFullscreen ? 'h-screen' : 'h-[560px]'
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
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                fitView
                fitViewOptions={{ padding: 0.2 }}
                panOnScroll={!isDrawMode}
                minZoom={0.3}
                maxZoom={1.5}
                nodesDraggable={!isDrawMode}
                nodesConnectable={false}
                elementsSelectable={!isDrawMode}
              >
                <MiniMap nodeStrokeWidth={2} />
                <Controls />
                <Background gap={18} size={1} color="#e2e8f0" />
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
      )}
    </div>
  );
}
