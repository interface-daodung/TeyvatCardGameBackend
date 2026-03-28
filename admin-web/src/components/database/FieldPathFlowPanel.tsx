import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MarkerType,
  MiniMap,
  type Edge,
  type Node,
  type ReactFlowInstance,
} from 'reactflow';
import 'reactflow/dist/style.css';
import type { FieldTypeSummary } from '../../services/databaseManagementService';
import { Badge } from '../ui/badge';
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

  const [selectedPath, setSelectedPath] = useState<string | null>(null);

  const rfInstanceRef = useRef<ReactFlowInstance | null>(null);

  const nodes: Node[] = useMemo(() => {
    return nodeIds.map((id) => {
      const pos = positions.get(id) ?? { x: 0, y: 0 };
      const label = lastSegment(id);
      const selected = id === selectedPath;
      return {
        id,
        position: pos,
        data: { label, fullPath: id },
        style: {
          background: selected ? '#e0e7ff' : '#f8fafc',
          color: '#0f172a',
          border: selected ? '2px solid #6366f1' : '1px solid #cbd5e1',
          borderRadius: 8,
          fontSize: 11,
          padding: '8px 10px',
          width: 200,
          textAlign: 'left' as const,
        },
      };
    });
  }, [nodeIds, positions, selectedPath]);

  const edges: Edge[] = useMemo(() => {
    return rawEdges.map((e, i) => ({
      id: `e-${i}-${e.from}->${e.to}`,
      source: e.from,
      target: e.to,
      markerEnd: { type: MarkerType.ArrowClosed, color: '#64748b' },
      style: { stroke: '#94a3b8', strokeWidth: 1.2 },
    }));
  }, [rawEdges]);

  const onInit = useCallback((instance: ReactFlowInstance) => {
    rfInstanceRef.current = instance;
    requestAnimationFrame(() => instance.fitView({ padding: 0.18 }));
  }, []);

  useEffect(() => {
    const inst = rfInstanceRef.current;
    if (!inst) return;
    const id = requestAnimationFrame(() => inst.fitView({ padding: 0.18 }));
    return () => cancelAnimationFrame(id);
  }, [nodeIds.join('|'), edges.length]);

  const onNodeClick = useCallback((_evt: React.MouseEvent, node: Node) => {
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
        Quan hệ <strong>cha → con</strong> theo prefix path MongoDB. Bấm node để xem chi tiết scan.
      </p>
      <div className="rounded-lg border border-slate-200 overflow-hidden bg-slate-50">
        <div className="h-[min(52vh,520px)] min-h-[320px] w-full">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onInit={onInit}
            onNodeClick={onNodeClick}
            fitView
            minZoom={0.08}
            maxZoom={1.5}
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
                Path trung gian (chỉ xuất hiện vì là tiền tố của field khác) — không có bản ghi riêng trong
                snapshot cho đúng path này, hoặc chưa được scan trên mẫu.
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
