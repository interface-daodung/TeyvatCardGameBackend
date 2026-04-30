import { useMemo } from 'react';
import type { FieldTypeSummary } from '../../services/databaseManagementService';
import { Badge } from '../ui/badge';
import {
  buildPathToSummaryMap,
  buildTrieFromPathSet,
  collectGraphPathsFromLeafSummaries,
  type FieldPathTrieNode,
} from './fieldPathTreeUtils';

function TrieBranch({
  node,
  pathToSummary,
  sampleUsed,
}: {
  node: FieldPathTrieNode;
  pathToSummary: Map<string, FieldTypeSummary>;
  sampleUsed: number;
}) {
  const summary = pathToSummary.get(node.path);
  const hasChildren = node.children.length > 0;

  if (!hasChildren) {
    return (
      <div className="flex items-start gap-2 py-1 pl-1 text-sm font-mono text-slate-800 border-l border-slate-200 ml-1">
        <span className="text-slate-400 shrink-0" aria-hidden>
          ◆
        </span>
        <div className="min-w-0 flex-1">
          <div className="truncate" title={node.path}>
            <span className="text-slate-500">{node.segment}</span>
            {summary && (
              <span className="ml-2 text-xs font-sans text-slate-500">
                <Badge variant="outline" className="text-[10px] px-1 py-0 align-middle">
                  {summary.types.slice(0, 2).join(', ')}
                  {summary.types.length > 2 ? '…' : ''}
                </Badge>
              </span>
            )}
          </div>
          {summary && (
            <div className="text-xs font-sans text-slate-600 mt-0.5">
              {summary.docsWithPath}/{sampleUsed} docs
              {summary.examples[0] ? ` · ex: ${summary.examples[0]}` : ''}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <details className="group border-l border-slate-200 ml-1 pl-0" open>
      <summary className="cursor-pointer list-none py-1 pl-1 text-sm font-mono text-slate-800 marker:content-none flex items-center gap-2 [&::-webkit-details-marker]:hidden">
        <span className="text-slate-400 shrink-0 select-none inline-block transition-transform group-open:rotate-90">▶</span>
        <span className="font-semibold text-slate-700">{node.segment}</span>
        {summary && (
          <Badge variant="outline" className="text-[10px] px-1 py-0 font-sans shrink-0">
            {summary.types.slice(0, 2).join(', ')}
            {summary.types.length > 2 ? ` +${summary.types.length - 2}` : ''}
          </Badge>
        )}
        <span className="text-xs font-sans text-slate-400 truncate" title={node.path}>
          {node.path}
        </span>
      </summary>
      <div className="ml-3 border-l border-slate-100 pl-1 space-y-0.5">
        {node.children.map((c) => (
          <TrieBranch key={c.path} node={c} pathToSummary={pathToSummary} sampleUsed={sampleUsed} />
        ))}
      </div>
    </details>
  );
}

type FieldPathTreePanelProps = {
  /** Field đã lọc theo search (chỉ hiển thị nhánh dẫn tới các path này). */
  filteredFieldSummaries: FieldTypeSummary[];
  /** Toàn bộ scan của collection — tra cứu meta cho node trung gian. */
  allFieldSummaries: FieldTypeSummary[];
  sampleUsed: number;
};

export function FieldPathTreePanel({ filteredFieldSummaries, allFieldSummaries, sampleUsed }: FieldPathTreePanelProps) {
  const pathSet = useMemo(
    () => collectGraphPathsFromLeafSummaries(filteredFieldSummaries),
    [filteredFieldSummaries]
  );

  const trieRoots = useMemo(() => buildTrieFromPathSet(pathSet), [pathSet]);

  const pathToSummary = useMemo(() => buildPathToSummaryMap(allFieldSummaries), [allFieldSummaries]);

  if (filteredFieldSummaries.length === 0) {
    return <p className="text-sm text-muted-foreground py-6 text-center">Không tìm thấy field nào phù hợp.</p>;
  }

  return (
    <div className="max-h-[min(70vh,640px)] overflow-y-auto rounded-lg border border-slate-100 bg-slate-50/40 p-3">
      <p className="text-xs text-slate-500 mb-3">
        Tree by MongoDB path structure (segments separated by <code className="text-[11px]">.</code>, arrays{' '}
        <code className="text-[11px]">[]</code>).
      </p>
      <div className="space-y-0.5">
        {trieRoots.map((n) => (
          <TrieBranch key={n.path} node={n} pathToSummary={pathToSummary} sampleUsed={sampleUsed} />
        ))}
      </div>
    </div>
  );
}
